import Logger from "../utils/logger";
import {EventEmitter} from "events";
import {Config} from "../config";
import {EvmFactory} from "./evm.factory";
import {DexPairABI} from "../abis";
import {BigDecimal} from "../utils/bigdecimal";

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
}
