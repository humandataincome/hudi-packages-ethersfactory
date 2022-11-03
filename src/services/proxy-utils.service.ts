import * as ethers from 'ethers';
import { BigDecimal } from '../utils/bigdecimal';
import {DexFactoryABI, DexRouter02ABI, ERC20ABI, ProxyUtilsABI, WETHABI} from '../abis';
import { EventEmitter } from 'events';
import { EvmFactory } from './evm.factory';
import { Config } from '../config';
import { Signer } from '@ethersproject/abstract-signer';
import Logger from '../utils/logger';

/**
 * This util class is intended to contains all required function to
 * interact with our ProxyUtils contract
 *
 */
export class ProxyUtilsService {
  public listeners = new EventEmitter();
  private logger = new Logger(ProxyUtilsService.name);
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  public async doBatchTransferToken(signerOrPrivateKey: Signer | string, tokenAddresses: string | string[], addresses: string[], amounts: BigDecimal[]): Promise<string> {
    this.logger.log('info', `doBatchTransferToken: ${tokenAddresses} ${addresses} ${amounts}`);
    const signer = this.factory.getSigner(signerOrPrivateKey);

    const uniqueTokenAddresses = typeof tokenAddresses === 'string' ? [tokenAddresses] : [...new Set(tokenAddresses)];
    if (uniqueTokenAddresses.length > 1) //TODO: Support multiple token address thorough decimal cache
      throw new Error('Supporting only batch transfer for an unique token address');

    const tokenAddress = uniqueTokenAddresses[0];

    const tokenContract = this.factory.getContract(tokenAddress, ERC20ABI).connect(signer);
    const tokenDecimal = await tokenContract.decimals();

    const totalAmount = amounts.reduce((a, c) => a.add(c), new BigDecimal(0));

    if ((await tokenContract.balanceOf(await signer.getAddress())).lt(totalAmount.toBigNumber(tokenDecimal)))
      throw new Error('Not enough balance');

    if ((await tokenContract.allowance(this.config.addresses.proxyUtils, await signer.getAddress())).lt(totalAmount.toBigNumber(tokenDecimal)))
      await (await tokenContract.approve(this.config.addresses.proxyUtils, ethers.constants.MaxUint256)).wait();

    const proxyUtilsContract = this.factory.getContract(this.config.addresses.proxyUtils, ProxyUtilsABI).connect(signer);
    const bdAmounts = await Promise.all(amounts.map(async (a) => a.toBigNumber(tokenDecimal)));
    const tx = await proxyUtilsContract.batchTransferToken(tokenAddress, addresses, bdAmounts);
    const result = await tx.wait();

    this.logger.log('info', `doBatchTransferToken: BATCH TRANSFER EXECUTED}`);
    return result;
  }

  public async doBatchSwapTokensForETH(signerOrPrivateKey: Signer | string, amountsIn: BigDecimal[], amountOutMins: BigDecimal[], paths: string[][], slippage: number[], tos?: string[], deadlineDelta = 60 * 10): Promise<string> {
    this.logger.log('info', `doBatchSwapTokensForETH: ${amountsIn} ${amountOutMins} ${paths} ${slippage} ${tos} ${deadlineDelta}`);
    const signer = this.factory.getSigner(signerOrPrivateKey);

    const WETHIndexPath = paths.findIndex((path) => path.some((address) => address === this.config.addresses.tokens.WETH));
    const WETHAmount = amountsIn[WETHIndexPath];
    console.log(WETHIndexPath)
    if (WETHIndexPath !== -1) {
      paths = paths.filter((_, index) => index !== WETHIndexPath);
      amountsIn = amountsIn.filter((_, index) => index !== WETHIndexPath);
      amountOutMins = amountOutMins.filter((_, index) => index !== WETHIndexPath);
    }

    console.log(paths)
    const {
      amountsInBigNumber,
      amountsOutBigNumber,
      toList,
      deadlines,
    } = await this.prepareForSwap(signer, amountsIn, amountOutMins, paths, slippage, deadlineDelta, tos);
    const proxyUtilsContract = this.factory.getContract(this.config.addresses.proxyUtils, ProxyUtilsABI).connect(signer);
    const tx = await proxyUtilsContract.batchSwapTokensForETH(amountsInBigNumber, amountsOutBigNumber, paths, toList, deadlines);
    const result = await tx.wait();

    const WETHContract = this.factory.getContract(this.config.addresses.tokens.WETH, WETHABI).connect(signer);
    const WETHTx = await WETHContract.withdraw(WETHAmount.toBigNumber(18))
    await WETHTx.wait();

    this.logger.log('info', `doBatchSwapTokensForETH: BATCH SWAP EXECUTED}`);
    return result;
  }

  public async doBatchSwapETHForTokens(signerOrPrivateKey: Signer | string, amountsIn: BigDecimal[], amountOutMins: BigDecimal[], paths: string[][], slippage: number[], tos?: string[], deadlineDelta = 60 * 10): Promise<string> {
    this.logger.log('info', `doBatchSwapETHForTokens: ${amountsIn} ${amountOutMins} ${paths} ${slippage} ${tos} ${deadlineDelta}`);

    const signer = this.factory.getSigner(signerOrPrivateKey);

    const {
      amountsInBigNumber,
      amountsOutBigNumber,
      toList,
      deadlines,
    } = await this.prepareForSwap(signer, amountsIn, amountOutMins, paths, slippage, deadlineDelta, tos);

    const proxyUtilsContract = this.factory.getContract(this.config.addresses.proxyUtils, ProxyUtilsABI).connect(signer);
    const tx = await proxyUtilsContract.batchSwapETHForTokens(amountsInBigNumber, amountsOutBigNumber, paths, toList, deadlines);
    const result = await tx.wait();

    this.logger.log('info', `doBatchSwapETHForTokens: BATCH SWAP EXECUTED}`);
    return result;
  }

  public async doBatchSwapTokensForTokens(signerOrPrivateKey: Signer | string, amountsIn: BigDecimal[], amountOutMins: BigDecimal[], paths: string[][], slippages: number[], tos?: string[], deadlineDelta = 60 * 10): Promise<string> {
    this.logger.log('info', `doBatchSwapTokensForTokens: ${amountsIn} ${amountOutMins} ${paths} ${slippages} ${tos} ${deadlineDelta}`);

    const signer = this.factory.getSigner(signerOrPrivateKey);

    const {
      amountsInBigNumber,
      amountsOutBigNumber,
      toList,
      deadlines,
    } = await this.prepareForSwap(signer, amountsIn, amountOutMins, paths, slippages, deadlineDelta, tos);
    const proxyUtilsContract = this.factory.getContract(this.config.addresses.proxyUtils, ProxyUtilsABI).connect(signer);
    const tx = await proxyUtilsContract.batchSwapTokensForTokens(amountsInBigNumber, amountsOutBigNumber, paths, toList, deadlines);
    const result = await tx.wait();

    this.logger.log('info', `doBatchSwapTokensForTokens: BATCH SWAP EXECUTED}`);
    return result;
  }

  public removeAllListeners(): void {
    this.listeners.removeAllListeners();
  }

  private async prepareForSwap(signer: Signer, amountsIn: BigDecimal[], amountOutMins: BigDecimal[], paths: string[][], slippage: number[], deadlineDelta: number, tos?: string[]): Promise<Record<string, unknown>> {

    const signerAddress = await signer.getAddress();

    const deadline = Math.floor(Date.now() / 1000) + deadlineDelta;
    const deadlines: number[] = [];

    let toList = tos;
    const customTos = toList && toList.length == paths.length;

    if (!customTos) {
      toList = [];
    }
    const dexRouterContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI);
    const dexFactoryAddress = await dexRouterContract.factory();
    const dexFactoryContract = this.factory.getContract(dexFactoryAddress, DexFactoryABI);

    const amountsInBigNumber: ethers.BigNumber[] = [];
    const amountsOutBigNumber: ethers.BigNumber[] = [];

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];

      const inputTokenContract = this.factory.getContract(path[0], ERC20ABI).connect(signer);
      const inputTokenSymbol = await inputTokenContract.symbol();
      const inputTokenDecimals = await inputTokenContract.decimals();

      // APPLY SLIPPAGE
      // IF THE SLIPPAGE IS NOT SET, A DEFAULT ONE WILL BE ASSIGNED
      amountOutMins[i] = amountOutMins[i].mul(1 - (slippage[i] ?? 0.001));

      const amountInBigNumber = amountsIn[i].toBigNumber(inputTokenDecimals);
      const amountOutBigNumber = amountOutMins[i].toBigNumber(inputTokenDecimals);

      // CHECK USER BALANCE FOR THE INPUT TOKEN
      if ((await inputTokenContract.balanceOf(signerAddress)).lt(amountInBigNumber)) {
        throw Error(`Not enough balance for ${inputTokenSymbol}`);
      }

      // CHECK TOKEN ALLOWANCE FOR THE PROXY CONTRACT
      if ((await inputTokenContract.allowance(signerAddress, this.config.addresses.proxyUtils)).lt(ethers.constants.MaxUint256)) {
        console.log('ALLOWANCE FOR THE PROXY CONTRACT');
        await (await inputTokenContract.approve(this.config.addresses.proxyUtils, ethers.constants.MaxUint256)).wait();
      }

      // CHECK IF THE PATH EXISTS
      const dexPairAddress = await dexFactoryContract.getPair(path[0], path[1]);
      if (dexPairAddress === '0x0000000000000000000000000000000000000000') {
        if (path[0].toLowerCase() == this.config.addresses.tokens.WETH.toLowerCase() || path[1].toLowerCase() == this.config.addresses.tokens.WETH.toLowerCase()) {
          throw new Error('LIQUIDITY POOL FOR THIS PAIR NOT FOUND');
        }
        // ADD WETH TO THE PATH
        paths[i] = [path[0], this.config.addresses.tokens.WETH, path[1]];
      }

      if (!customTos) {
        toList?.push(signerAddress);
      }

      deadlines.push(deadline);

      amountsInBigNumber.push(amountInBigNumber);
      amountsOutBigNumber.push(amountOutBigNumber);
    }

    return { amountsInBigNumber, amountsOutBigNumber, toList, deadlines };
  }
}
