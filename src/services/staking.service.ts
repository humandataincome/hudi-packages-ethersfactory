import { Config } from '../config';
import {ERC20ABI, StakingABI} from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';

export class Stake {
  balance: BigDecimal;
  stakeDate: Date;
}
export class StakingService {
  private logger = new Logger(StakingService.name);
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  async stake(signerOrPrivateKey: Signer | string, amountToStake: BigDecimal) : Promise<boolean> {
    if (amountToStake.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }

    this.logger.log('debug', `AMOUNT TO STAKE IS: ${amountToStake.toString()}`);

    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const signerAddress   = await signer.getAddress();
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    const stakingToken    = this.factory.getContract(this.config.addresses.tokens.HUDI, ERC20ABI).connect(signer);

    this.logger.log('debug', `STAKING TOKEN ADDRESS IS: ${this.config.addresses.tokens.HUDI}`);
    
    // APPROVE THE CONTRACT TO SPEND LPTOKENS
    const allowance = await stakingToken.allowance(signerAddress, this.config.addresses.staking);
    this.logger.log('debug', `CONTRACT ALLOWANCE FOR STAKING TOKEN IS: ${allowance.toString()}`);
    
    const amount = amountToStake.toBigNumber(18);
    
    if(allowance.lt(amount)) {
      this.logger.log('debug', `APPROVING ALLOWANCE...`);
      await (await stakingToken.connect(signer).approve(this.config.addresses.staking, ethers.constants.MaxUint256)).wait();
      this.logger.log('debug', `CONTRACT APPROVED TO SPEND STAKING TOKEN`);
    }
    
    try {
      this.logger.log('debug', `START TO STAKE... `);
      const tx = await stakingContract.connect(signer).stake(amount);
      await tx.wait()
      this.logger.log('debug', 'DONE');
      return true
    } catch (err) {
      this.logger.log('debug', `stake ERROR: ${err}`);
      return false;
    }
  }

  async getRewardsEarned(signerOrPrivateKey: Signer | string) : Promise<BigDecimal> {
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      this.logger.log('debug', `RETRIEVING REWARDS EARNED`);
      const result = await stakingContract.connect(signer).getRewardsEarned();
      this.logger.log('debug', `RESULT: ${BigDecimal.fromBigNumber(result)}`);
      return BigDecimal.fromBigNumber(result);
    } catch (err) {
      this.logger.log('debug', `getRewardsEarned ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getStakingTotalSupply(signerOrPrivateKey: Signer | string) : Promise<BigDecimal> {
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      this.logger.log('debug', `RETRIEVING STAKING TOTAL SUPPLY`);
      const result = await stakingContract.connect(signer).getStakingTotalSupply();
      this.logger.log('debug', `RESULT: ${BigDecimal.fromBigNumber(result)}`);
      return BigDecimal.fromBigNumber(result);
    } catch (err) {
      this.logger.log('debug', `getStakingTotalSupply ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getStakeInfo(signerOrPrivateKey: Signer | string) : Promise<Stake | undefined> {
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      this.logger.log('debug', `RETRIEVING USER STAKING INFO`);
      const result = await stakingContract.connect(signer).getStakeInfo();
      this.logger.log('debug', `RESULT: ${result}`);
      return {
        balance: BigDecimal.fromBigNumber(result.balance, 18),
        stakeDate: new Date(result.stakeDate.toNumber() * 1000)
      } as Stake;
    } catch (err: any) {
      if(err.message.includes('NO_STAKE_FOUND')) {
        this.logger.log('debug', `NO_STAKE_FOUND`);
        return undefined;
      }
      this.logger.log('debug', `getStake ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async withdraw(signerOrPrivateKey: Signer | string, amountToWithDraw: BigDecimal) : Promise<boolean> {
    if (amountToWithDraw.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }
    this.logger.log('debug', `AMOUNT TO WITHDRAW IS: ${amountToWithDraw.toString()}`);
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      this.logger.log('debug', `START TO WITHDRAW...`);
      const tx = await stakingContract.connect(signer).withdraw(amountToWithDraw.toBigNumber(18));
      await tx.wait();
      this.logger.log('debug', 'DONE');
      return true;
    } catch (err) {
      this.logger.log('debug', `withdraw ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async claimRewards(signerOrPrivateKey: Signer | string) : Promise<boolean> {
    
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      this.logger.log('debug', `START TO CLAIM REWARDS...`);
      const tx = await stakingContract.connect(signer).claimRewards();
      await tx.wait();
      this.logger.log('debug', 'DONE');
      return true;
    } catch (err) {
      this.logger.log('debug', `claimRewards ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async withdrawAndClaim(signerOrPrivateKey: Signer | string) : Promise<boolean> {
    
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      this.logger.log('debug', `START TO WITHDRAW AND CLAIM...`);
      const tx = await stakingContract.connect(signer).withdrawAndClaim();
      await tx.wait();
      this.logger.log('debug', 'DONE');
      return true;
    } catch (err) {
      this.logger.log('debug', `withdrawAndClaim ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }
}
