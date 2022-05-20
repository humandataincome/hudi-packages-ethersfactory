import Logger from "../utils/logger";
import {EventEmitter} from "events";
import {Config} from "../config";
import {EvmFactory} from "./evm.factory";
import {DexPairABI} from "../abis";
import {BigDecimal} from "../utils/bigdecimal";
import { DexService } from "./dex.service";

export class LPTokenService {
  //TODO: Add documentation
  private logger = new Logger(LPTokenService.name);
  private listeners = new EventEmitter();
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
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
      const contract = this.factory.getContract(tokenAddress, DexPairABI);
      const value = await contract.MINIMUM_LIQUIDITY();
      console.log('MINIMUM_LIQUIDITY:', value);
      return true;
    } catch(err) {
      console.log('isLPToken ERROR:', err);
      return false;
    }
  }

  async getUSDTEquivalent(lpTokenAddress: string, amount: BigDecimal): Promise<BigDecimal> {
    const contract = this.factory.getContract(lpTokenAddress, DexPairABI);

    const [ reserve0, reserve1, _ ] = await contract.getReserves();
    const totalSupply = await contract.totalSupply();
    const poolShare = amount.div(totalSupply);

    const token0 = await contract.token0();
    const token1 = await contract.token1();
    const amount0 = reserve0.mul(poolShare);
    const amount1 = reserve1.mul(poolShare);

    const dexService = new DexService(this.config);

    const amount0USDPrice = await dexService.getSwapAmountOut(token0, this.config.addresses.tokens.USDT, amount0);
    const amount1USDPrice = await dexService.getSwapAmountOut(token1, this.config.addresses.tokens.USDT, amount1);

    const result = amount0USDPrice.add(amount1USDPrice);
    return result;
  }
}
