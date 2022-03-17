import * as ethers from 'ethers';
import { ContractFactory } from 'ethers';
import { DexCandle, DexPoolInfo, DexSwapEvent } from './interfaces';
import { Config } from '../config';
import { DexFactoryABI, DexPairABI, DexRouter02ABI, ERC20ABI } from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { EvmFactory } from './evm.factory';
import { Signer } from '@ethersproject/abstract-signer';
import Logger from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * This util class is intended to contains all required function to
 * interact with Uniswap dex protocol clones
 *
 */
export class DexService {
  private logger = new Logger(DexService.name);
  private listeners = new EventEmitter();
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  public async addPoolInfoListener(aTokenAddress: string,
                                   bTokenAddress: string,
                                   listener: (poolInfo: DexPoolInfo) => void,
                                   initialPoolInfo?: DexPoolInfo): Promise<boolean> {
    let currentPoolInfo = initialPoolInfo;
    await this.addPoolChangeListener(aTokenAddress, bTokenAddress, (t, v0, _, p) => {
      //TODO: Here add all KPI in Pool Info
      if (!currentPoolInfo || currentPoolInfo.ath.gt(p)) {
        currentPoolInfo = {
          ath: p,
          price: new BigDecimal(0),
          volume: new BigDecimal(0),
          liquidity: new BigDecimal(0),
          capitalization: new BigDecimal(0),
        };
        listener(currentPoolInfo);
      }
    });
    return true;
  }

  public async addPoolCandleListener(aTokenAddress: string,
                                     bTokenAddress: string,
                                     duration: number,
                                     openCandleListener: (candle: DexCandle) => void,
                                     updateCandleListener: (candle: DexCandle) => void,
                                     closeCandleListener: (candle: DexCandle) => void,
                                     initialCandle?: DexCandle): Promise<boolean> {
    let currentCandle = initialCandle;
    await this.addPoolChangeListener(aTokenAddress, bTokenAddress, (t, v0, _, p) => {
      if (!currentCandle || currentCandle.t !== t - t % duration) {
        if (currentCandle)
          closeCandleListener(currentCandle);
        currentCandle = { t: t - t % duration, o: p, h: p, l: p, c: p, v: v0, n: new BigDecimal(1), a: p };
        openCandleListener(currentCandle);
      } else {
        currentCandle.h = BigDecimal.max(currentCandle.h, p);
        currentCandle.l = BigDecimal.min(currentCandle.l, p);
        currentCandle.c = p;
        currentCandle.v = currentCandle.v.plus(v0);
        currentCandle.a = currentCandle.a.mul(currentCandle.n).plus(p).div(currentCandle.n.plus(1));
        currentCandle.n = currentCandle.n.plus(1);
        updateCandleListener(currentCandle);
      }
    });
    return true;
  }

  public async addPoolChangeListener(aTokenAddress: string,
                                     bTokenAddress: string,
                                     listener: (timestamp: number, aVolume: BigDecimal, bVolume: BigDecimal, rate: BigDecimal) => void): Promise<boolean> {
    const res = await this.addSwapEventListener(aTokenAddress, bTokenAddress, (swapEvent) => {
      const amount0 = swapEvent.amount0In.plus(swapEvent.amount0Out);
      const amount1 = swapEvent.amount1In.plus(swapEvent.amount1Out);
      if (swapEvent.token1 === aTokenAddress)
        listener(swapEvent.timestamp, amount0, amount1, amount0.div(amount1));
      else
        listener(swapEvent.timestamp, amount1, amount0, amount1.div(amount0));
    });
    if (!res) {
      const dexRouterContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI);
      const dexWethAddress = await dexRouterContract.WETH();
      let wethToBTokenRate = await this.getSwapAmountOut(dexWethAddress, bTokenAddress, new BigDecimal(1));
      await this.addPoolChangeListener(dexWethAddress, bTokenAddress, (_, __, ___, p) => wethToBTokenRate = p);
      await this.addPoolChangeListener(aTokenAddress, dexWethAddress, (t, v0, v1, p) => listener(t, v0.times(wethToBTokenRate), v1.times(wethToBTokenRate), p.times(wethToBTokenRate)));
    }
    return true;
  }

  public async addSwapEventListener(aTokenAddress: string, bTokenAddress: string, listener: (swapEvent: DexSwapEvent) => void, waitLiquidity = false): Promise<boolean> {
    const eventName = `swap-${aTokenAddress < bTokenAddress ? aTokenAddress : bTokenAddress}-${aTokenAddress < bTokenAddress ? bTokenAddress : aTokenAddress}`;
    if (this.listeners.addListener(eventName, listener).listenerCount(eventName) === 1) {
      const dexRouterContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI);
      const dexFactoryAddress = await dexRouterContract.factory();
      const dexFactoryContract = this.factory.getContract(dexFactoryAddress, DexFactoryABI);
      const dexPairAddress = await dexFactoryContract.getPair(aTokenAddress, bTokenAddress);
      if (dexPairAddress === '0x0000000000000000000000000000000000000000') {
        if (waitLiquidity)
          this.factory.provider.on(dexFactoryContract.filters.PairCreated(
              [aTokenAddress, bTokenAddress], [aTokenAddress, bTokenAddress]),
            async () => await this.addSwapEventListener(aTokenAddress, bTokenAddress, listener));
        return false;
      }
      const dexPairContract = this.factory.getContract(dexPairAddress, DexPairABI);
      const token0 = await dexPairContract.token0();
      const token1 = await dexPairContract.token1();
      const token0Contract = this.factory.getContract(token0, ERC20ABI);
      const token0Decimals = await token0Contract.decimals();
      const token1Contract = this.factory.getContract(token1, ERC20ABI);
      const token1Decimals = await token1Contract.decimals();

      let lastBlock: ethers.providers.Block;

      this.factory.provider.on(dexPairContract.filters.Swap(), async (event) => {
        const parsedEventArgs = dexPairContract.interface.parseLog(event).args;
        if (!lastBlock || lastBlock.number !== event.blockNumber)
          lastBlock = await this.factory.provider.getBlock(event.blockNumber);

        this.listeners.emit(eventName, {
          timestamp: lastBlock.timestamp,
          sender: parsedEventArgs.sender,
          token0,
          token1,
          amount0In: BigDecimal.fromBigNumber(parsedEventArgs.amount0In, -token0Decimals),
          amount0Out: BigDecimal.fromBigNumber(parsedEventArgs.amount0Out, -token0Decimals),
          amount1In: BigDecimal.fromBigNumber(parsedEventArgs.amount1In, -token1Decimals),
          amount1Out: BigDecimal.fromBigNumber(parsedEventArgs.amount1Out, -token1Decimals),
          to: parsedEventArgs.to,
        });
      });
    }
    return true;
  }

  public async getSwapAmountOut(inputTokenAddress: string, outputTokenAddress: string, amountIn: BigDecimal): Promise<BigDecimal> {
    const dexRouterContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI);
    const inputTokenContract = this.factory.getContract(inputTokenAddress, ERC20ABI);
    const inputTokenDecimals = await inputTokenContract.decimals();
    const outputTokenContract = this.factory.getContract(outputTokenAddress, ERC20ABI);
    const outputTokenDecimals = await outputTokenContract.decimals();
    const dexSwapAmountsOut = await dexRouterContract.getAmountsOut(
      amountIn.toBigNumber(inputTokenDecimals),
      [inputTokenAddress, this.config.addresses.tokens.WETH, outputTokenAddress].filter((e, i, a) => a.indexOf(e) === i),
    );
    return BigDecimal.fromBigNumber([...dexSwapAmountsOut].pop(), outputTokenDecimals);
  }

  public async removeAllListeners(): Promise<void> {
    this.listeners.removeAllListeners();
  }

  async doSwapExactTokensForETH(signerOrPrivateKey: Signer | string, inputTokenAddress: string, amount: BigDecimal, slippage = 0.001, toAddress?: string, deadlineDelta = 60 * 10): Promise<string> {
    this.logger.log('info', `doSwapExactTokensForETH ${inputTokenAddress} ${amount} ${slippage} ${toAddress} ${deadlineDelta}`);

    const signer = this.factory.getSigner(signerOrPrivateKey);

    const dexRouterContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI).connect(signer);

    const pairAddress = [inputTokenAddress, this.config.addresses.tokens.WETH];
    const deadline = Math.floor(Date.now() / 1000) + deadlineDelta;

    const inputTokenContract = ContractFactory.getContract(inputTokenAddress, ERC20ABI).connect(signer);
    const inputTokenDecimals = await inputTokenContract.decimals();

    const amountIn = amount.toBigNumber(inputTokenDecimals);
    const amountOut = [...(await dexRouterContract.getAmountsOut(amountIn, pairAddress))].pop();
    const amountOutMin = BigDecimal.fromBigNumber(amountOut).mul(1 - slippage).toBigNumber();

    if ((await inputTokenContract.balanceOf(await signer.getAddress())).lt(amountIn))
      throw Error('Not enough balance');

    if ((await inputTokenContract.allowance(await signer.getAddress(), this.config.addresses.dexRouter)).lt(amountIn))
      await (await inputTokenContract.approve(this.config.addresses.dexRouter, ethers.constants.MaxUint256)).wait(); //Here should be amountIn instead of MaxUint256

    const tx = await dexRouterContract.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      pairAddress,
      toAddress ?? await signer.getAddress(),
      deadline);

    return await tx.wait();
  }

  async doSwapExactETHForTokens(signerOrPrivateKey: Signer | string, outputTokenAddress: string, amount: BigDecimal, slippage = 0.001, toAddress?: string, deadlineDelta = 60 * 10, includeFee = false): Promise<string> {
    this.logger.log('info', `doSwapExactETHForTokens ${outputTokenAddress} ${amount} ${slippage} ${toAddress} ${deadlineDelta}`);

    const signer = this.factory.getSigner(signerOrPrivateKey);

    const dexRouterContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI).connect(signer);

    const pairAddress = [this.config.addresses.tokens.WETH, outputTokenAddress];
    const deadline = Math.floor(Date.now() / 1000) + deadlineDelta;

    let amountIn = amount.toBigNumber(18);
    let amountOut = [...(await dexRouterContract.getAmountsOut(amountIn, pairAddress))].pop();
    let amountOutMin = BigDecimal.fromBigNumber(amountOut).mul(1 - slippage).toBigNumber();

    if ((await this.factory.provider.getBalance(await signer.getAddress())).lt(amountIn))
      throw Error('Not enough balance');

    if (includeFee) {
      const gasPrice = await this.factory.provider.getGasPrice();
      const gasLimit = await dexRouterContract.estimateGas.swapExactETHForTokens(
        amountOutMin,
        pairAddress,
        toAddress ?? await signer.getAddress(),
        deadline, { value: amountIn });
      amountIn = amountIn.sub(gasLimit.mul(gasPrice));
      amountOut = [...(await dexRouterContract.getAmountsOut(amountIn, pairAddress))].pop();
      amountOutMin = BigDecimal.fromBigNumber(amountOut).mul(1 - slippage).toBigNumber();
    }

    const tx = await dexRouterContract.swapExactETHForTokens(
      amountOutMin,
      pairAddress,
      toAddress ?? await signer.getAddress(),
      deadline, { value: amountIn });

    return await tx.wait();
  }
}

