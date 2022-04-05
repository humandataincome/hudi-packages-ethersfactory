import {BlockWithTransactions} from '@ethersproject/abstract-provider';
import { EvmFactory } from './evm.factory';
import { EventEmitter } from 'events';
import Logger from '../utils/logger';
import { Config } from '../config';
import { ethers } from 'ethers';
import {Transaction} from "@ethersproject/transactions/src.ts";

/**
 * This util class is intended to contains all required function to
 * interact with low level EVM logics
 *
 */
export class EvmService {
  private logger = new Logger(EvmService.name);
  private listeners = new EventEmitter();
  private factory: EvmFactory;

  constructor(config: Config) {
    this.factory = new EvmFactory(config);
  }

  public static decodeTransaction(transaction: Transaction, contractABI: string[]): Record<string, unknown> {
    const inter = new ethers.utils.Interface(contractABI);
    const decodedInput = inter.parseTransaction({
      data: transaction.data ? transaction.data : '',
      value: transaction.value ? transaction.value : '',
    });
    const params = decodedInput.args.map(x => {
      if ((typeof x) == 'object') {
        return x.toString();
      }
      return x;
    });
    // Decoded Transaction
    const result = {
      function_name: decodedInput.name,
      from: transaction.from,
      args: params,
    };
    return result;
  }

  public async addBlockListener(listener: (block: BlockWithTransactions) => void, includeCurrent = true): Promise<void> {
    const eventName = `block`;
    if (this.listeners.addListener(eventName, listener).listenerCount(eventName) === 1) {
      if (includeCurrent)
        this.factory.provider.getBlockNumber().then(async (n) => listener(await this.factory.provider.getBlockWithTransactions(n)));

      this.factory.provider.on('block', async (blockNumber) => {
        const latestBlock = await this.factory.provider.getBlockWithTransactions(blockNumber);
        this.listeners.emit(eventName, latestBlock);
      });
    }
  }

  public removeAllListeners(): void {
    this.listeners.removeAllListeners();
  }
}


