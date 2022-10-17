import { Config } from '../config';
import { ERC20ABI, VestingABI } from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';

type Vesting = {
  totalLockedValue: number;
  totalReleasedValue: number;
  releaseValue: number;
  releasePeriod: number; // days in milliseconds
  startTimestamp: number; // timestamp in milliseconds
  cliffPeriod: number; // days in millisecondss
};

export class VestingService {
  private logger = new Logger(VestingService.name);
  private config: Config;
  private factory: EvmFactory;
  vestingContractAddress: string;

  constructor(config: Config, vestingContractAddress: string) {
    this.config = config;
    this.factory = new EvmFactory(config);
    this.vestingContractAddress = vestingContractAddress;
  }
  /**
   *
   * @param signerOrPrivateKey the signer that will create the vesting
   * @param destinationWalletAddress the wallet deposit address of the vetsing
   * @param totalLockedValue the value to lock
   * @param releaseValue the value per time that will be released
   * @param releasePeriod the amount of the release days in milliseconds
   * @param cliffPeriod the amount of the total vesting days in milliseconds
   * @param startTimestamp the start day of the vesting in timestamp format
   */
  async createVesting(
    signerOrPrivateKey: Signer | string,
    destinationWalletAddress: string,
    totalLockedValue: BigDecimal,
    releaseValue: BigDecimal,
    releasePeriod: number,
    cliffPeriod: number,
    startTimestamp: number,
  ): Promise<void> {
    if (totalLockedValue.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }

    this.logger.log(
      'debug',
      `AMOUNT TO DEPOSIT IS: ${totalLockedValue.toString()}`,
    );

    const signer = this.factory.getSigner(signerOrPrivateKey);
    const signerAddress = await signer.getAddress();
    const vestingContract = this.factory
      .getContract(this.vestingContractAddress, VestingABI)
      .connect(signer);
    const vestingTokenAddress = this.config.addresses.tokens.HUDI;
    const vestingToken = this.factory
      .getContract(vestingTokenAddress, ERC20ABI)
      .connect(signer);

    this.logger.log(
      'debug',
      `VESTING TOKEN ADDRESS IS: ${vestingTokenAddress}`,
    );

    // APPROVE THE CONTRACT TO SPEND VESTING TOKEN
    const allowance = await vestingToken.allowance(
      signerAddress,
      this.vestingContractAddress,
    );
    this.logger.log(
      'debug',
      `CONTRACT ALLOWANCE FOR VESTING TOKEN IS: ${allowance.toString()}`,
    );

    const vestingAmount = totalLockedValue.toBigNumber(18);

    if (allowance.lt(vestingAmount)) {
      this.logger.log('debug', `APPROVING ALLOWANCE...`);
      await (
        await vestingToken.approve(
          this.vestingContractAddress,
          ethers.constants.MaxUint256,
        )
      ).wait();
      this.logger.log('debug', `CONTRACT APPROVED TO SPEND VESTING TOKEN`);
    }

    try {
      this.logger.log('debug', `START TO CREATE VESTING... `);
      const tx = await vestingContract.createVesting(
        destinationWalletAddress,
        totalLockedValue.toBigNumber(18),
        releaseValue.toBigNumber(18),
        releasePeriod,
        cliffPeriod,
        startTimestamp,
      );
      await tx.wait();
      this.logger.log('debug', 'DONE');
    } catch (err) {
      this.logger.log('debug', `createVesting ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  /**
   * returns the vesting ids for the contract caller
   * @param signerOrPrivateKey the signer for the contact call
   * @returns
   */
  async getVestingIds(signerOrPrivateKey: Signer | string): Promise<string[]> {
    try {
      const signer = this.factory.getSigner(signerOrPrivateKey);
      const vestingContract = this.factory
        .getContract(this.vestingContractAddress, VestingABI)
        .connect(signer);
      return await vestingContract.getVestingIds();
    } catch (err) {
      this.logger.log('debug', `getVestingIds ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  /**
   * returns the vesting by the vestingId
   * @param signerOrPrivateKey the signer for the contact call
   * @param vestingId // the id of the vesting
   * @returns
   */
  async getVesting(
    signerOrPrivateKey: Signer | string,
    vestingId: string,
  ): Promise<Vesting> {
    try {
      const signer = this.factory.getSigner(signerOrPrivateKey);
      const vestingContract = this.factory
        .getContract(this.vestingContractAddress, VestingABI)
        .connect(signer);
      return await vestingContract.getVesting(vestingId);
    } catch (err) {
      this.logger.log('debug', `getVesting ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  /**
   * returns the amount that the caller can claim at the exact moment
   * @param signerOrPrivateKey the signer for the contact call
   * @param vestingId // the id of the vesting
   * @returns
   */
  async getClaimableAmount(
    signerOrPrivateKey: Signer | string,
    vestingId: string,
  ): Promise<BigDecimal> {
    try {
      const signer = this.factory.getSigner(signerOrPrivateKey);
      const vestingContract = this.factory
        .getContract(this.vestingContractAddress, VestingABI)
        .connect(signer);
      const amount = await vestingContract.getClaimableAmount(vestingId);
      return BigDecimal.fromBigNumber(amount, 18);
    } catch (err) {
      this.logger.log('debug', `getClaimableAmount ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }
}
