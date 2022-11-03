import { Config } from '../config';
import {ERC20ABI, ProxyUtilsABI, WETHABI} from '../abis';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import { EventEmitter } from 'events';

export class TokenService {
  //TODO: Add documentation
  private logger = new Logger(TokenService.name);
  private listeners = new EventEmitter();
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  public async getBalance(address: string, tokenAddress?: string): Promise<BigDecimal> {
    if (!tokenAddress || tokenAddress === this.config.addresses.tokens.ETH) {
      return BigDecimal.fromBigNumber(await this.factory.provider.getBalance(address), 18);
    }

    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI);
    const tokenDecimals = await tokenContract.decimals();
    return BigDecimal.fromBigNumber(await tokenContract.balanceOf(address), tokenDecimals);
  }

  public async getDecimals(tokenAddress?: string): Promise<number> {
    if (!tokenAddress || tokenAddress === this.config.addresses.tokens.ETH) {
      return 18;
    }
    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI);
    return await tokenContract.decimals();
  }

  public async getName(tokenAddress?: string): Promise<string> {
    if (!tokenAddress || tokenAddress === this.config.addresses.tokens.ETH) {
      return 'Ethereum';
    }
    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI);
    return await tokenContract.name();
  }

  public async getSymbol(tokenAddress?: string): Promise<string> {
    if (!tokenAddress || tokenAddress === this.config.addresses.tokens.ETH) {
      return 'ETH';
    }
    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI);
    return await tokenContract.symbol();
  }

  public async doTransfer(signerOrPrivateKey: Signer | string, tokenAddress: string | undefined, toAddress: string, amount?: BigDecimal, includeFee = true): Promise<void> {
    const signer = this.factory.getSigner(signerOrPrivateKey);
    amount = amount ?? await this.getBalance(await signer.getAddress(), tokenAddress);

    if (!tokenAddress || tokenAddress === this.config.addresses.tokens.ETH) {
      const gasPrice = await signer.getGasPrice();
      const value = amount.toBigNumber(18);
      const transaction: TransactionRequest = {
        from: await signer.getAddress(),
        to: toAddress,
        gasPrice,
      };
      transaction.gasLimit = await signer.estimateGas(transaction);
      transaction.value = includeFee ? value.sub(transaction.gasLimit.mul(gasPrice)) : value;
      const tx = await signer.sendTransaction(transaction);
      await tx.wait();
    } else {
      const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI).connect(signer);

      const tokenDecimals = await tokenContract.decimals();
      const tx = await tokenContract.transfer(toAddress, amount.toBigNumber(tokenDecimals));
      await tx.wait();
    }
  }

  public async doBatchTransfer(signerOrPrivateKey: Signer | string, tokenAddresses: string[], toAddresses: string[], amounts: BigDecimal[]): Promise<boolean> {
    const signer = this.factory.getSigner(signerOrPrivateKey);

    const uniqueTokenAddresses = [...new Set(tokenAddresses)];
    if (uniqueTokenAddresses.length > 1)
      throw new Error('Supporting only batch transfer for an unique token address');

    const tokenAddress = uniqueTokenAddresses[0];

    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI);
    const tokenDecimal = await tokenContract.decimals();

    const totalAmount = amounts.reduce((a, c) => a.add(c), new BigDecimal(0));

    if ((await tokenContract.balanceOf(await signer.getAddress())).lt(totalAmount.toBigNumber(tokenDecimal)))
      throw new Error('Not enough balance');

    for (let i = 0; i < tokenAddresses.length; i++) {
      this.logger.log('info', `Transferring ${amounts[i]} (${tokenAddresses[i]}) to ${toAddresses[i]}`);
      await this.doTransfer(signerOrPrivateKey, tokenAddresses[i], toAddresses[i], amounts[i]);
    }
    return true;
  }

  public async getTotalSupply(tokenAddress: string): Promise<BigDecimal> {
    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI);
    return BigDecimal.fromBigNumber(await tokenContract.totalSupply(), 18);
  }

  public async unwrapWETH(signerOrPrivateKey: Signer | string, amount: BigDecimal) {
    const signer = this.factory.getSigner(signerOrPrivateKey);

    const contract = this.factory.getContract(this.config.addresses.tokens.WETH, WETHABI).connect(signer);
    const tx = await contract.withdraw(amount.toBigNumber(18))
    return await tx.wait();
  }

  public async wrapETH(signerOrPrivateKey: Signer | string, amount: BigDecimal) {
    const signer = this.factory.getSigner(signerOrPrivateKey);

    const contract = this.factory.getContract(this.config.addresses.tokens.WETH, WETHABI).connect(signer);
    const tx = await contract.deposit({ value: amount.toBigNumber(18) })
    return await tx.wait();
  }

  public removeAllListeners(): void {
    this.listeners.removeAllListeners();
  }

  /*
  public static provider = new ethers.providers.JsonRpcProvider(EvmProviderUrl);

  public static async parseTransferTransaction(transaction: TransactionResponse): Promise<EVMTransferTransaction> {
    const transactionReceipt = await this.provider.getTransactionReceipt(transaction.hash);
    if (transaction.data.length > 10) { // if more than 4 bytes + 0x prefix, so 10 char
      const transactionData = ethers.utils.defaultAbiCoder.decode(['address', 'uint256'],
        hexDataSlice(transaction.data, 4)); // transfer(address recipient, uint256 amount)
      return {
        tokenAddress: transaction.to!,
        verified: transactionReceipt && transactionReceipt.blockNumber > 0 && transactionReceipt.status === 1,
        from: transaction.from,
        to: transactionData[0],
        amount: transactionData[1],
      };
    } else {
      return {
        tokenAddress: this.tokens.BNB,
        verified: transactionReceipt && transactionReceipt.blockNumber > 0 && transactionReceipt.status === 1,
        from: transaction.from,
        to: transaction.to!,
        amount: transaction.value,
      };
    }
  }

  public static async makeTransaction(senderPrivateKey: string,
                                      recipientAddress: string,
                                      tokenAddress: string,
                                      amount: BigNumber,
                                      includeFee = true): Promise<void> {
    const wallet = new ethers.Wallet(senderPrivateKey, this.provider);
    if (tokenAddress === this.tokens.BNB) {
      const transaction: TransactionRequest = {
        from: wallet.address,
        to: recipientAddress,
        gasPrice: await this.provider.getGasPrice(),
      };
      transaction.gasLimit = await this.provider.estimateGas(transaction);
      transaction.value = includeFee ? amount.sub(transaction.gasLimit.mul(transaction.gasPrice!)) : amount;
      await wallet.sendTransaction(transaction);
    } else {
      const ERC20Contract = new ethers.Contract(tokenAddress, this.ERC20Abi, wallet);
      await ERC20Contract.Transfer(recipientAddress, amount);
    }
  }

  // Real time or past explore functions

  public static async getTransaction(transactionHash: string): Promise<EVMTransferTransaction> {
    const transaction = await this.provider.getTransaction(transactionHash);
    return await this.parseTransferTransaction(transaction);
  }

  public static async getBalance(address: string, tokenAddress: string): Promise<BigNumber> {
    if (tokenAddress === '0x0') {
      return await this.provider.getBalance(address);
    }

    const ERC20Contract = new ethers.Contract(tokenAddress, this.ERC20Abi, this.provider);
    return await ERC20Contract.balanceOf(address);
  }

  public static async addBalanceListener(address: string,
                                         tokenAddress: string,
                                         listener: (balance: BigNumber) => void,
                                         includeCurrent = true) {
    let oldBalance: BigNumber;

    if (includeCurrent)
      listener(oldBalance = await this.getBalance(address, tokenAddress));

    this.provider.on('block', async () => {
      const newBalance = await this.getBalance(address, tokenAddress);
      if (!oldBalance.eq(newBalance)) {
        listener(oldBalance = newBalance);
      }
    });
  }

  // Needs better listeners managing
  public static async addInTransactionListener(
    address: string,
    tokenAddress: string,
    listener: (transaction: EVMTransferTransaction) => void): Promise<void> {
    if (tokenAddress === this.tokens.BNB) {
      this.addBlockListener(block => {
        block.transactions.forEach(async t => {
          if (t.data === '0x' && t.to === address) {
            listener(await this.parseTransferTransaction(t));
          }
        });
      });
    } else {
      const ERC20Contract = new ethers.Contract(tokenAddress, this.ERC20Abi, this.provider);
      const eventFilter = ERC20Contract.filters.Transfer(null, address);
      ERC20Contract.on(eventFilter, async (from, to, amount, event) => {
        listener(await this.parseTransferTransaction(event)); // Needs more tests
      });
    }
  }
  // TO BE FINISHED https://github.com/Zvezdin/blockchain-predictor/blob/master/js/getter.js
  public static async getTransactionsIn(address: string, tokenAddress: string, blocksLookback: number = 4990, listener: (from: string, to: string, amount: BigNumber, event: any) => void): Promise<void> {
    if (tokenAddress == this.tokens.BNB) {
      console.log(await this.provider.getBlockWithTransactions(11762744));
      // Here we can store last X blocks and read them like the listener
    } else {

      let filters = {
        address: tokenAddress,
        fromBlock: (await this.provider.getBlockNumber()) - blocksLookback,
        toBlock: "latest",
        topics: [
          id("Transfer(address,address,uint256)"),
          null,
          hexZeroPad(address, 32)
        ]
      };

      this.provider.getLogs(filters).then((logs) => {
        console.log(logs);
      });
    }
  }
*/
}
