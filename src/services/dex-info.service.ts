import Logger from '../utils/logger';
import {Config} from '../config';
import {EvmFactory} from './evm.factory';
import {DexInfoPairDayDatas, DexInfoPoolInfo} from './interfaces';
import {BigDecimal} from '../utils/bigdecimal';
import {gql, request} from 'graphql-request';

/**
 * This util class is intended to contains all required function to
 * interact with Uniswap dex protocol clones info subgraph API
 * See:
 * https://pancakeswap.finance/info/pool/0x9428d7f0660b1ec8e42930c08443880f8f663875
 * https://pancakeswap.finance/info/token/0x83d8Ea5A4650B68Cd2b57846783d86DF940F7458
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

  public async getPairInfo(pairAddress: string, limit = 7, offset = 0): Promise<DexInfoPoolInfo> {
    const query = gql`
      query pairDayDatas($first: Int!, $skip: Int!, $address: Bytes!) {
        pairDayDatas(
          first: $first
          skip: $skip
          where: { pairAddress: $address }
          orderBy: date
          orderDirection: asc
        ) {
          date
          dailyVolumeUSD
          reserveUSD
          reserve0
          reserve1
        }
      }
    `;

    const variables = {
      first: limit,
      skip: offset,
      address: pairAddress,
    };

    const headers = {
      Origin: 'https://pancakeswap.finance',
    };

    const response: { pairDayDatas: DexInfoPairDayDatas[] } = await request(this.config.dexSubgraphUrl, query, variables, headers);

    const data = response.pairDayDatas.map((v: { date: unknown; dailyVolumeUSD: string; reserveUSD: string; reserve0: string; reserve1: string }) => {
      const reserve0 = new BigDecimal(v.reserve0);
      const reserve1 = new BigDecimal(v.reserve1);
      const reserveUSD = new BigDecimal(v.reserveUSD);
      const price = reserve1.div(reserve0);
      const priceUSD = reserveUSD.div(2).div(reserve1).mul(price);
      return {
        reserve0,
        reserve1,
        price,
        priceUSD,
        reserveUSD,
        volumeUSD: new BigDecimal(v.dailyVolumeUSD)
      };
    });
    const weeklyData = data.slice(0, 7);
    const weeklySumVolumeUSD = weeklyData.reduce((a: BigDecimal, c) => a.plus(c.volumeUSD), new BigDecimal(0));
    const weeklyAvgReserveUSD = weeklyData.reduce((a: BigDecimal, c) => a.plus(c.reserveUSD), new BigDecimal(0)).div(data.length);

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
