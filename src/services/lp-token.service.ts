import Logger from "../utils/logger";
import {EventEmitter} from "events";
import {Config} from "../config";
import {EvmFactory} from "./evm.factory";
import {DexPairABI} from "../abis";
import {BigDecimal} from "../utils/bigdecimal";
import { BigNumber } from 'ethers';
import { DexService } from "./dex.service";
import util from 'util';
export class LPTokenService {
  //TODO: Add documentation
  private logger = new Logger(LPTokenService.name);
  private listeners = new EventEmitter();
  private config: Config;
  private factory: EvmFactory;
  private dexService: DexService;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
    this.dexService = new DexService(config);
  }

  async getReserves(lpTokenAddress: string) {
    const contract = this.factory.getContract(lpTokenAddress, DexPairABI);
    const decimal = await contract.getDecimals(lpTokenAddress);

    const [ reserve0, reserve1, blockTimestampLast ] = await contract.getReserves();

    return [
      BigDecimal.fromBigNumber(reserve0, decimal),
      BigDecimal.fromBigNumber(reserve1, decimal),
      blockTimestampLast
    ];
  }

  async isLPToken(tokenAddress: string): Promise<boolean> {
    try {
      this.logger.log('debug', `isLPToken: ${tokenAddress}`);
      const contract = this.factory.getContract(tokenAddress, DexPairABI);
      const value = await contract.MINIMUM_LIQUIDITY();
      this.logger.log('debug', `RESULT: TRUE`);
      return true;
    } catch(err) {
      this.logger.log('debug', `RESULT: FALSE`);
      return false;
    }
  }

  async getUSDTEquivalent(lpTokenAddress: string, amount: BigDecimal): Promise<BigDecimal> {
    this.logger.log('debug', `getUSDTEquivalent: ${util.inspect({lpTokenAddress, amount: amount.toString()})}`);
    const contract = this.factory.getContract(lpTokenAddress, DexPairABI);

    const reserves: BigNumber[] = await contract.getReserves();
    const reserve0 = BigDecimal.fromBigNumber(reserves[0], 18);
    const reserve1 = BigDecimal.fromBigNumber(reserves[1], 18);
    const totalSupply = BigDecimal.fromBigNumber(await contract.totalSupply(), 18);
    this.logger.log('debug', `totalSupply: ${totalSupply.toString()}`);
    const poolShare = amount.div(totalSupply);

    const token0 = await contract.token0();
    const token1 = await contract.token1();
    this.logger.log('debug', `token0: ${token0}`);
    this.logger.log('debug', `token1: ${token1}`);
    this.logger.log('debug', `reserves: ${util.inspect({reserve0: reserves[0].toString(), reserve1: reserves[1].toString()})}`);
    const amount0 = reserve0.mul(poolShare);
    const amount1 = reserve1.mul(poolShare);
    const amount0USDPrice = await this.dexService.getSwapAmountOut(token0, this.config.addresses.tokens.USDT, amount0);
    const amount1USDPrice = await this.dexService.getSwapAmountOut(token1, this.config.addresses.tokens.USDT, amount1);

    const result = amount0USDPrice.add(amount1USDPrice);
    this.logger.log('debug', `RESULT: ${result.toString()}`);
    return result;
  }

  async getTokensRatio(tokenAddress1: string, tokenAddress2: string): Promise<BigDecimal> {
    this.logger.log('debug', `getTokensRatio: ${util.inspect({tokenAddress1, tokenAddress2})}`);
    const baseAmount = new BigDecimal(1);
    let stakingTokenToRewardTokenRatio: BigDecimal;

    if (tokenAddress1 === tokenAddress2) {
      stakingTokenToRewardTokenRatio = new BigDecimal(1);
    }
    else {
      const isStakingTokenLP  = await this.isLPToken(tokenAddress1);
      
      const isRewardTokenLP   = await this.isLPToken(tokenAddress2);

      if (!isStakingTokenLP && !isRewardTokenLP) {
        stakingTokenToRewardTokenRatio = await this.dexService.getSwapAmountOut(tokenAddress1, tokenAddress2, baseAmount);
      } else {
        let stakingTokenUSDPrice;
        if (isStakingTokenLP) {
          stakingTokenUSDPrice = await this.getUSDTEquivalent(tokenAddress1, baseAmount);
        } else {
          stakingTokenUSDPrice = await this.dexService.getSwapAmountOut(tokenAddress1, this.config.addresses.tokens.USDT, baseAmount);
        }

        let rewardTokenUSDPrice;
        if (isRewardTokenLP) {
          rewardTokenUSDPrice = await this.getUSDTEquivalent(tokenAddress2, baseAmount);
        } else {
          rewardTokenUSDPrice = await this.dexService.getSwapAmountOut(tokenAddress2, this.config.addresses.tokens.USDT, baseAmount);
        }

        stakingTokenToRewardTokenRatio = stakingTokenUSDPrice.div(rewardTokenUSDPrice);
      }
    }
    this.logger.log('debug', `RESULT: ${stakingTokenToRewardTokenRatio.toString()}`);
    return stakingTokenToRewardTokenRatio;
  }
}
