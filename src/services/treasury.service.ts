import { Config } from '../config';
import { ERC20ABI, TreasuryABI } from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';
import { EvmService } from './evm.service';

export class TreasuryService {
  private logger = new Logger(TreasuryService.name);
  private config: Config;
  private factory: EvmFactory;

  treasuryContractAddress: string;

  constructor(config: Config, treasuryContractAddress: string) {
    this.config = config;
    this.factory = new EvmFactory(config);
    this.treasuryContractAddress = treasuryContractAddress;
  }

  /**
   *
   * @param signerOrPrivateKey signer for the transaction
   * @param amountToDeposit amount to deposit to the contract
   * @returns transactionHash: string; from: string; amount: BigDecimal
   */
  async deposit(
    signerOrPrivateKey: Signer | string,
    amountToDeposit: BigDecimal,
  ): Promise<{ transactionHash: string; from: string; amount: BigDecimal }> {
    if (amountToDeposit.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }

    this.logger.log(
      'debug',
      `AMOUNT TO DEPOSIT IS: ${amountToDeposit.toString()}`,
    );

    const signer = this.factory.getSigner(signerOrPrivateKey);
    const signerAddress = await signer.getAddress();

    const treasuryContract = this.factory
      .getContract(this.treasuryContractAddress, TreasuryABI)
      .connect(signer);

    const treasuryTokenAddress = this.config.addresses.tokens.HUDI;
    const treasuryToken = this.factory
      .getContract(treasuryTokenAddress, ERC20ABI)
      .connect(signer);

    this.logger.log(
      'debug',
      `TREASURY TOKEN ADDRESS IS: ${treasuryTokenAddress}`,
    );

    // APPROVE THE CONTRACT TO SPEND TREASURY TOKEN
    const allowance = await treasuryToken.allowance(
      signerAddress,
      this.treasuryContractAddress,
    );
    this.logger.log(
      'debug',
      `CONTRACT ALLOWANCE FOR TREASURY TOKEN IS: ${allowance.toString()}`,
    );

    const amount = amountToDeposit.toBigNumber(18);

    if (allowance.lt(amount)) {
      this.logger.log('debug', `APPROVING ALLOWANCE...`);
      await (
        await treasuryToken.approve(
          this.treasuryContractAddress,
          ethers.constants.MaxUint256,
        )
      ).wait();
      this.logger.log('debug', `CONTRACT APPROVED TO SPEND TREASURY TOKEN`);
    }

    try {
      this.logger.log('debug', `START TO DEPOSIT... `);
      const tx = await treasuryContract.transferIn(amount);
      const rc = await tx.wait();

      const event = rc.events.find((e: any) => e.event === 'TransferredIn');
      const [from, amountTransferred] = event.args;
      const result = {
        transactionHash: tx.hash,
        from,
        amount: BigDecimal.fromBigNumber(amountTransferred),
      };
      this.logger.log('debug', 'DONE');
      this.logger.log('debug', 'RESULT: ' + JSON.stringify(result));

      return result;
    } catch (err) {
      this.logger.log('debug', `deposit ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  /**
   *
   * @param signerOrPrivateKey signer for the transaction
   * @param truthHolder this signer will sign the claim transaction
   * @param id nonce for the transaction
   * @param amount amount to claim
   * @param deadline date fro the deadline in SECONDS
   */
  async claim(
    signerOrPrivateKey: Signer | string,
    truthHolder: Signer | string,
    id: number,
    amount: BigDecimal,
    deadline: number,
  ) {
    try {
      // PREPARING THE MESSAGE
      const to = await this.factory.getSigner(signerOrPrivateKey).getAddress();
      const treasuryTokenAddress = this.config.addresses.tokens.HUDI;
      const amountToClaim = amount.toBigNumber(18);
      const argTypes = ['uint256', 'address', 'address', 'uint256', 'uint256'];
      const argValues = [id, to, treasuryTokenAddress, amountToClaim, deadline];
      const message = EvmService.getAbiEncodedArguments(argTypes, argValues);

      // SIGN MESSAGE
      const user = this.factory.getSigner(signerOrPrivateKey);
      const signer = this.factory.getSigner(truthHolder);
      const signature = await signer.signMessage(message);

      // CLAIM
      const treasuryContract = this.factory
        .getContract(this.treasuryContractAddress, TreasuryABI)
        .connect(user);

      this.logger.log('debug', `START TO CLAIM... `);
      const tx = await treasuryContract.transferOut(message, signature);
      await tx.wait();
      this.logger.log('debug', 'DONE');
    } catch (err) {
      this.logger.log('debug', `claim ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }
}
