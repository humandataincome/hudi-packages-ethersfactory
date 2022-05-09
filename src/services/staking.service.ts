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

    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const signerAddress   = await signer.getAddress();
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    const stakingToken    = this.factory.getContract(this.config.addresses.tokens.HUDI, ERC20ABI).connect(signer);

    this.logger.log('debug', `STAKING TOKEN ADDRESS IS: ${this.config.addresses.tokens.HUDI}`);
    
    // APPROVE THE CONTRACT TO SPEND LPTOKENS
    const allowance = await stakingToken.allowance(signerAddress, this.config.addresses.staking);
    this.logger.log('debug', `CONTRACT ALLOWANCE FOR STAKING TOKEN IS: ${allowance.toString()}`);

    if(allowance.lt(amountToStake)) {
      await (await stakingToken.connect(signer).approve(this.config.addresses.staking, ethers.constants.MaxUint256)).wait();
      this.logger.log('debug', `CONTRACT APPROVED TO SPEND STAKING TOKEN`);
    }
    
    try {
      this.logger.log('debug', `START TO STAKE... `);
      const tx = await stakingContract.connect(signer).stake(amountToStake.toBigNumber(18));
      await tx.wait()
      this.logger.log('debug', 'DONE');

      return true
    } catch (err) {
      this.logger.log('debug', `stake ERROR: ${err}`);
      return false;
    }
  }

  async getRewardsEarned(signerOrPrivateKey: Signer | string) : Promise<BigDecimal> {
    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      const result = await stakingContract.connect(signer).getRewardsEarned();
      return BigDecimal.fromBigNumber(result);
    } catch (err) {
      this.logger.log('debug', `getRewardsEarned ERROR: ${err}`);
      return undefined;
    }
  }

  async getStakingTotalSupply(signerOrPrivateKey: Signer | string) : Promise<BigDecimal> {
    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      const result = await stakingContract.connect(signer).getStakingTotalSupply();
      return BigDecimal.fromBigNumber(result);
    } catch (err) {
      this.logger.log('debug', `getStakingTotalSupply ERROR: ${err}`);
      return undefined;
    }
  }

  async getStake(signerOrPrivateKey: Signer | string) : Promise<Stake> {
    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      const result = await stakingContract.connect(signer).getStake();
      return {
        balance: BigDecimal.fromBigNumber(result.balance),
        stakeDate: new Date(result.stakeDate)
      } as Stake;
    } catch (err) {
      this.logger.log('debug', `getStake ERROR: ${err}`);
      return undefined;
    }
  }

  async withdraw(signerOrPrivateKey: Signer | string, amountToWithDraw: BigDecimal) : Promise<boolean> {
    if (amountToWithDraw.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }

    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      const result = await stakingContract.connect(signer).withdraw(amountToWithDraw.toBigNumber(18));
      return result;
    } catch (err) {
      this.logger.log('debug', `withdraw ERROR: ${err}`);
      return undefined;
    }
  }

  async claimRewards(signerOrPrivateKey: Signer | string) : Promise<boolean> {
    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      const result = await stakingContract.connect(signer).claimRewards();
      return result;
    } catch (err) {
      this.logger.log('debug', `claimRewards ERROR: ${err}`);
      return undefined;
    }
  }

  async withdrawAndClaim(signerOrPrivateKey: Signer | string) : Promise<boolean> {
    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.config.addresses.staking, StakingABI).connect(signer);
    
    try {
      const result = await stakingContract.connect(signer).withdrawAndClaim();
      return result;
    } catch (err) {
      this.logger.log('debug', `withdrawAndClaim ERROR: ${err}`);
      return undefined;
    }
  }
}
