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
  private tokenEncoding: BufferEncoding;

  treasuryContractAddress: string;

  constructor(config: Config, treasuryContractAddress: string) {
    this.config = config;
    this.factory = new EvmFactory(config);
    this.treasuryContractAddress = treasuryContractAddress;
    this.tokenEncoding = 'base64';
  }

  /**
   *
   * @param signerOrPrivateKey signer for the transaction
   * @param amountToDeposit amount to deposit to the contract
   * @returns transactionHash: string;
   */
  async deposit(
    signerOrPrivateKey: Signer | string,
    amountToDeposit: BigDecimal,
  ): Promise<string> {
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
      await tx.wait();

      this.logger.log('debug', 'DONE');
      return tx.hash;
    } catch (err) {
      this.logger.log('debug', `deposit ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  /**
   *
   * @param signerOrPrivateKey caller for the transaction
   * @param token encoded string contained message and signature
   */
  async withdraw(
    signerOrPrivateKey: Signer | string,
    token: string,
  ): Promise<boolean> {
    try {
      const user = this.factory.getSigner(signerOrPrivateKey);

      // RETRIEVE THE MESSAGE AND THE SIGNATURE FROM THE TOKEN
      const encoding = this.tokenEncoding;
      const decoded = Buffer.from(token, encoding).toString();

      const strArray = decoded.split('.');

      const message = new Uint8Array(Buffer.from(strArray[0], encoding));
      const signature = Buffer.from(strArray[1], encoding).toString();

      // WITHDRAW
      const treasuryContract = this.factory
        .getContract(this.treasuryContractAddress, TreasuryABI)
        .connect(user);

      this.logger.log('debug', `WITHDRAW... `);
      const tx = await treasuryContract.transferOut(message, signature);
      await tx.wait();
      this.logger.log('debug', 'DONE');

      return true;
    } catch (err) {
      this.logger.log('debug', `claim ERROR: ${err}`);
      throw new Error('Server Error');
    }
  }

  /**
   *
   * @param txHash the transaction hash
   * @returns
   */
  async decodeDepositByTxHash(
    txHash: string,
  ): Promise<{ from: string; amount: BigDecimal } | null> {
    const logs = await EvmService.parseTransactionLogs(
      this.factory.provider,
      txHash,
      TreasuryABI,
    );
    const event = logs.find((x) => x && x.name == 'TransferredIn');
    if (!event) {
      return null;
    }
    const from = event.args['from'];
    const amount = BigDecimal.fromBigNumber(event.args['amount'], 18);

    return { from, amount };
  }

  /**
   *
   * @param signerOrPrivateKey caller for the transaction
   * @param truthHolder this signer will sign the claim transaction
   * @param id nonce for the transaction
   * @param amount amount to claim
   * @param deadline date fro the deadline in SECONDS
   * @returns token: the encoded string containing the message and the signature
   */
  async encodeWithdrawToken(
    signerOrPrivateKey: Signer | string,
    id: ethers.BigNumber,
    truthHolder: Signer | string,
    amount: BigDecimal,
    deadline: number,
  ): Promise<string> {
    // PREPARING THE MESSAGE
    const to = await this.factory.getSigner(signerOrPrivateKey).getAddress();
    const treasuryTokenAddress = this.config.addresses.tokens.HUDI;
    const amountToClaim = amount.toBigNumber(18);
    const argTypes = ['uint256', 'address', 'address', 'uint256', 'uint256'];
    const argValues = [id, to, treasuryTokenAddress, amountToClaim, deadline];
    const message = EvmService.getAbiEncodedArguments(argTypes, argValues);

    // SIGN MESSAGE
    const signer = this.factory.getSigner(truthHolder);
    const signature = await signer.signMessage(message);

    // CREATE TOKEN WITH MESSAGE AND SIGNATURE
    const encoding = 'base64';
    const messageEnc = Buffer.from(message).toString(encoding);
    const signatureEnc = Buffer.from(signature).toString(encoding);
    const token = Buffer.from(`${messageEnc}.${signatureEnc}`).toString(
      encoding,
    );

    return token;
  }
}
