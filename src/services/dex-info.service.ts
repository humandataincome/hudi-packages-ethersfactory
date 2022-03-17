import Logger from '../utils/logger';
import { Config } from '../config';
import { EvmFactory } from './evm.factory';
import { DexInfoPoolInfo } from './interfaces';
import { BigDecimal } from '../utils/bigdecimal';
import { gql, request } from 'graphql-request';

/**
 * This util class is intended to contains all required function to
 * interact with Uniswap dex protocol clones info subgraph API
 * See: https://pancakeswap.finance/info/pool/0x9428d7f0660b1ec8e42930c08443880f8f663875
 *
 */
export class DexInfoService {
  private logger = new Logger(DexInfoService.name);
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  public async getPairInfo(pairAddress: string): Promise<DexInfoPoolInfo> {
    const query = gql`
      {
        pairDayDatas(first: 7, skip: 0, where: {pairAddress: "${pairAddress}"}, orderBy: date, orderDirection: desc) {
          date
          dailyVolumeUSD
          reserveUSD
        }
      }
    `;

    const response = await request(this.config.dexSubgraphUrl, query);

    const data = response.pairDayDatas.map((v: any) => {
      return { reserveUSD: new BigDecimal(v.reserveUSD), volumeUSD: new BigDecimal(v.dailyVolumeUSD) };
    });
    const weeklySumVolumeUSD = data.reduce((a: BigDecimal, c: any) => a.plus(c.volumeUSD), new BigDecimal(0));
    const weeklyAvgReserveUSD = data.reduce((a: BigDecimal, c: any) => a.plus(c.reserveUSD), new BigDecimal(0)).div(data.length);

    const weeklyFeeUSD = weeklySumVolumeUSD.mul(0.17 / 100); //0.17+0.8 DEX fees
    const yearlyEstimatedFeeUSD = weeklyFeeUSD.mul(365 / 7);
    const annualPercentageRate = yearlyEstimatedFeeUSD.div(weeklyAvgReserveUSD);

    return {
      reserveUSD: data[0].reserveUSD,
      volume24hUSD: data[0].volumeUSD,
      volume7dUSD: weeklySumVolumeUSD,
      annualPercentageRate7d: annualPercentageRate,
      dailyInfo: data,
    } as DexInfoPoolInfo;
  }
}
