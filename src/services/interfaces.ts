import { BigDecimal } from '../utils/bigdecimal';

export interface DexSwapEvent {
  timestamp: number;
  sender: string;
  token0: string;
  token1: string;
  amount0In: BigDecimal;
  amount1In: BigDecimal;
  amount0Out: BigDecimal;
  amount1Out: BigDecimal;
  to: string;
}

export interface PredictionClaimEvent {
  timestamp: number;
  sender: string;
  epoch: number;
  amount: BigDecimal;
}

export interface DexCandle {
  t: number; // Open time
  o: BigDecimal; // Open
  h: BigDecimal; // High
  l: BigDecimal; // Low
  c: BigDecimal; // Close
  v: BigDecimal; // Volume
  a: BigDecimal; // Average
  n: BigDecimal; // Ticks number
}

export interface DexPoolInfo {
  ath: BigDecimal;
  price: BigDecimal;
  volume: BigDecimal;
  liquidity: BigDecimal;
  capitalization: BigDecimal;
}

export interface TokenTransferTransaction {
  tokenAddress: string;
  verified: boolean;
  from: string;
  to: string;
  amount: BigDecimal;
}

export type BscScanHolder = {
  rank: string,
  address: string,
  name_tag: string,
  balance: string,
  percentage: string,
  txn_count: string
}

export type BscScanTokenHolding = {
  address: string,
  symbol: string,
  balance: string
}

export type DexInfoPoolInfo = {
  reserveUSD: BigDecimal,
  volume24hUSD: BigDecimal,
  volume7dUSD: BigDecimal,
  annualPercentageRate7d: BigDecimal,
  dailyInfo: { reserveUSD: BigDecimal, volumeUSD: BigDecimal }[]
}
