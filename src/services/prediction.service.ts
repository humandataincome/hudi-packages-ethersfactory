import Logger from '../utils/logger';
import { EventEmitter } from 'events';
import { Config } from '../config';
import { EvmFactory } from './evm.factory';
import { PredictionClaimEvent } from './interfaces';
import * as ethers from 'ethers';
import { BigDecimal } from '../utils/bigdecimal';
import { PredictionABI } from '../abis/prediction';

/**
 * This util class is intended to contains all required function to
 * interact with Pancakeswap dex prediction protocol
 *
 */
export class PredictionService {
  public listeners = new EventEmitter();
  private logger = new Logger(PredictionService.name);
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  public async removeAllListeners(): Promise<void> {
    this.listeners.removeAllListeners();
  }

  public async addClaimEventListener(listener: (claimEvent: PredictionClaimEvent) => void): Promise<boolean> {
    const eventName = `claim`;
    if (this.listeners.addListener(eventName, listener).listenerCount(eventName) === 1) {
      const predictionContract = this.factory.getContract(this.config.addresses.prediction, PredictionABI);

      let lastBlock: ethers.providers.Block;
      /*
      const filter = Object.assign(
        { fromBlock: (await this.factory.provider.getBlockNumber()) - 500, toBlock: 'latest'},
        predictionContract.filters.Claim()
      );
       */
      this.factory.provider.on(predictionContract.filters.Claim(), async (event) => {
        const parsedEventArgs = predictionContract.interface.parseLog(event).args;
        if (!lastBlock || lastBlock.number !== event.blockNumber)
          lastBlock = await this.factory.provider.getBlock(event.blockNumber);

        this.listeners.emit(eventName, {
          timestamp: lastBlock.timestamp,
          sender: parsedEventArgs.sender,
          epoch: parsedEventArgs.epoch.toNumber(),
          amount: BigDecimal.fromBigNumber(parsedEventArgs.amount, 18),
        });
      });
    }
    return true;
  }
}
