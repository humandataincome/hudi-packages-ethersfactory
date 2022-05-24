import {Config} from '../config';
import {ERC20ABI, StakingABI} from '../abis';
import {BigDecimal} from '../utils/bigdecimal';
import {Signer} from '@ethersproject/abstract-signer';
import {EvmFactory} from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';
import {LPTokenService} from './lp-token.service';

export class Stake {
  balance: BigDecimal;
  stakeDate: Date;
}

export class StakingService {
  private logger = new Logger(StakingService.name);
  private config: Config;
  private factory: EvmFactory;
  private lpTokenService: LPTokenService;
  stakingContractAddress: string;

  constructor(config: Config, stakingContractAddress: string) {
    this.config = config;
    this.factory = new EvmFactory(config);
    this.stakingContractAddress = stakingContractAddress;
    this.lpTokenService = new LPTokenService(config);
  }

  async stake(signerOrPrivateKey: Signer | string, amountToStake: BigDecimal): Promise<void> {
    if (amountToStake.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }

    this.logger.log('debug', `AMOUNT TO STAKE IS: ${amountToStake.toString()}`);

    const signer = this.factory.getSigner(signerOrPrivateKey);
    const signerAddress = await signer.getAddress();
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(signer);
    const stakingTokenAddress = await stakingContract.getStakingTokenAddress();
    const stakingToken = this.factory.getContract(stakingTokenAddress, ERC20ABI).connect(signer);

    this.logger.log('debug', `STAKING TOKEN ADDRESS IS: ${stakingTokenAddress}`);

    // APPROVE THE CONTRACT TO SPEND STAKING TOKEN
    const allowance = await stakingToken.allowance(signerAddress, this.stakingContractAddress);
    this.logger.log('debug', `CONTRACT ALLOWANCE FOR STAKING TOKEN IS: ${allowance.toString()}`);

    const amount = amountToStake.toBigNumber(18);

    if (allowance.lt(amount)) {
      this.logger.log('debug', `APPROVING ALLOWANCE...`);
      await (await stakingToken.approve(this.stakingContractAddress, ethers.constants.MaxUint256)).wait();
      this.logger.log('debug', `CONTRACT APPROVED TO SPEND STAKING TOKEN`);
    }

    try {
      this.logger.log('debug', `START TO STAKE... `);
      const tx = await stakingContract.stake(amount);
      await tx.wait()
      this.logger.log('debug', 'DONE');
    } catch (err) {
      this.logger.log('debug', `stake ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getRewardsEarned(signerOrPrivateKey: Signer | string): Promise<BigDecimal> {
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(signer);

    try {
      this.logger.log('debug', `RETRIEVING REWARDS EARNED`);
      const result = await stakingContract.getRewardsEarned();
      this.logger.log('debug', `RESULT: ${BigDecimal.fromBigNumber(result, 18)}`);
      return BigDecimal.fromBigNumber(result, 18);
    } catch (err) {
      this.logger.log('debug', `getRewardsEarned ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getStakingTotalSupply(): Promise<BigDecimal> {
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(this.factory.provider);

    try {
      this.logger.log('debug', `RETRIEVING STAKING TOTAL SUPPLY`);
      const result = await stakingContract.getStakingTotalSupply();
      this.logger.log('debug', `RESULT: ${BigDecimal.fromBigNumber(result, 18)}`);
      return BigDecimal.fromBigNumber(result, 18);
    } catch (err) {
      this.logger.log('debug', `getStakingTotalSupply ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getAnnualPercentageRate(): Promise<BigDecimal> {
    try {
      this.logger.log('debug', `RETRIEVING STAKING APR`);

      const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(this.factory.provider);
      this.logger.log('debug', `stakingContractAddress: ${this.stakingContractAddress}`);
      const stakingTokenAddress: string = await stakingContract.getStakingTokenAddress();
      const stakingToken = this.factory.getContract(stakingTokenAddress, ERC20ABI);
      const stakingTokenContractBalance: ethers.BigNumber = await stakingToken.balanceOf(this.stakingContractAddress);
      const stakingTotalSupply = BigDecimal.fromBigNumber(await stakingContract.getStakingTotalSupply(), 18);
      this.logger.log('debug', `contract stakingTotalSupply: ${stakingTotalSupply.toString()}`);
      if (stakingTotalSupply.isZero()) {
        return new BigDecimal(0);
      }

      // ONLY FOR DEBUG PURPOSE
      this.logger.log('debug', `stakingTokenAddress: ${stakingTokenAddress}`);
      const rewardTokenAddress: string = await stakingContract.getRewardTokenAddress();
      this.logger.log('debug', `rewardTokenAddress: ${rewardTokenAddress}`);

      this.logger.log('debug', `contract stakingTokenContractBalance: ${stakingTokenContractBalance.toString()}`);
      const rewardToken = this.factory.getContract(rewardTokenAddress, ERC20ABI);
      const rewardTokenContractBalance = await rewardToken.balanceOf(this.stakingContractAddress);
      this.logger.log('debug', `contract rewardTokenContractBalance: ${rewardTokenContractBalance.toString()}`);


      const rewardRate = (BigDecimal.fromBigNumber(await stakingContract.rewardRate(), 18));
      this.logger.log('debug', `rewardRate: ${rewardRate.toString()}`);

      //const rewardPerToken = BigDecimal.fromBigNumber(await stakingContract.rewardPerToken(), 18);
      const rewardPerToken = rewardRate.div(stakingTotalSupply);
      this.logger.log('debug', `rewardPerToken: ${rewardPerToken.toString()}`);
      const apr = rewardPerToken.mul(365).mul(24).mul(60).mul(60);
      this.logger.log('debug', `fixed apr: ${apr.toString()}`);

      const stakingTokenToRewardTokenRatio = await this.lpTokenService.getTokensRatio(stakingTokenAddress, rewardTokenAddress);

      const result = apr.mul(stakingTokenToRewardTokenRatio);
      this.logger.log('debug', `RESULT: ${result.toString()}`);
      return result;

    } catch (err) {
      this.logger.log('debug', `getAnnualPercentageRate ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getStakingMinAmount(): Promise<BigDecimal> {
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(this.factory.provider);

    try {
      this.logger.log('debug', `RETRIEVING STAKING MIN AMOUNT`);
      const result = await stakingContract.stakingMinAmount();
      this.logger.log('debug', `RESULT: ${BigDecimal.fromBigNumber(result)}`);
      return BigDecimal.fromBigNumber(result);
    } catch (err) {
      this.logger.log('debug', `getStakingMinAmount ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getStakingMaxAmount(): Promise<BigDecimal> {
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(this.factory.provider);

    try {
      this.logger.log('debug', `RETRIEVING STAKING MAX AMOUNT`);
      const result = await stakingContract.stakingMaxAmount();
      this.logger.log('debug', `RESULT: ${BigDecimal.fromBigNumber(result)}`);
      return BigDecimal.fromBigNumber(result);
    } catch (err) {
      this.logger.log('debug', `getStakingMaxAmount ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getWithdrawLockPeriod(): Promise<BigDecimal> {
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(this.factory.provider);
    try {
      this.logger.log('debug', `RETRIEVING WITHDRAW LOCK PERIOD`);
      const result = await stakingContract.withdrawLockPeriod();
      this.logger.log('debug', `RESULT: ${result} seconds`);
      return BigDecimal.fromBigNumber(result, 0); // Is integer inside BigNumber
    } catch (err) {
      this.logger.log('debug', `getWithdrawLockPeriod ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async getStakeInfo(signerOrPrivateKey: Signer | string): Promise<Stake | undefined> {
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(signer);

    try {
      this.logger.log('debug', `RETRIEVING USER STAKING INFO`);
      const result = await stakingContract.getStakeInfo();
      this.logger.log('debug', `RESULT: ${result}`);
      return {
        balance: BigDecimal.fromBigNumber(result.balance, 18),
        stakeDate: new Date(result.stakeDate.toNumber() * 1000)
      } as Stake;
    } catch (err: any) {
      if (err.message.includes('NO_STAKE_FOUND')) {
        this.logger.log('debug', `NO_STAKE_FOUND`);
        return undefined;
      }
      this.logger.log('debug', `getStake ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async withdraw(signerOrPrivateKey: Signer | string, amountToWithDraw: BigDecimal): Promise<boolean> {
    if (amountToWithDraw.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }
    this.logger.log('debug', `AMOUNT TO WITHDRAW IS: ${amountToWithDraw.toString()}`);
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(signer);

    try {
      this.logger.log('debug', `START TO WITHDRAW...`);
      const tx = await stakingContract.withdraw(amountToWithDraw.toBigNumber(18));
      await tx.wait();
      this.logger.log('debug', 'DONE');
      return true;
    } catch (err) {
      this.logger.log('debug', `withdraw ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async claimRewards(signerOrPrivateKey: Signer | string): Promise<boolean> {

    const signer = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(signer);

    try {
      this.logger.log('debug', `START TO CLAIM REWARDS...`);
      const tx = await stakingContract.claimRewards();
      await tx.wait();
      this.logger.log('debug', 'DONE');
      return true;
    } catch (err) {
      this.logger.log('debug', `claimRewards ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  async withdrawAndClaim(signerOrPrivateKey: Signer | string): Promise<boolean> {

    const signer = this.factory.getSigner(signerOrPrivateKey);
    const stakingContract = this.factory.getContract(this.stakingContractAddress, StakingABI).connect(signer);

    try {
      this.logger.log('debug', `START TO WITHDRAW AND CLAIM...`);
      const tx = await stakingContract.withdrawAndClaim();
      await tx.wait();
      this.logger.log('debug', 'DONE');
      return true;
    } catch (err) {
      this.logger.log('debug', `withdrawAndClaim ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }
}
