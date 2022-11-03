export type LogLevel =
  | 'error'
  | 'warn'
  | 'info'
  | 'http'
  | 'verbose'
  | 'debug'
  | 'silly';

export interface Config {
  addresses: {
    tokens: {
      ETH: string; // This is our convention, 0x0000000000000000000000000000000000000000
      WBNB: string;
      WETH: string;
      HUDI: string;
      USDT: string;
      BUSD: string;
      WBNBHUDI: string;
    };
    proxyUtils: string;
    dexRouter: string;
    miniLiquidityProvider: string;
    pancakeSwapLocker: string;
    prediction: string;
    staking: string;
    stakingLPToken: string;
    vesting: string;
    treasury: string;
  };
  jsonRpcUrl: string;
  explorerUrl: string;
  dexSubgraphUrl: string;
  logLevel: LogLevel;
}
