import { ethers } from 'ethers';
import { Signer } from '@ethersproject/abstract-signer';
import { Config } from '../config';
import crypto from 'crypto';
import { randomString } from '../utils/utils';
import { entropyToMnemonic } from '@ethersproject/hdnode';
import { arrayify } from 'ethers/lib/utils';
import Logger from '../utils/logger';
import { EventEmitter } from 'events';

export class EvmFactory {
  public provider: ethers.providers.JsonRpcProvider;
  private contractsCache: Record<string, ethers.Contract> = {};
  private logger = new Logger(EvmFactory.name);
  private listeners = new EventEmitter();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(this.config.jsonRpcUrl);
  }

  //TODO: Override decimals in ERC20 to cache it

  public getContract(address: string, abis: string[]): ethers.Contract {
    return this.getContractFromCacheOrMiss(address, () => new ethers.Contract(address, abis, this.provider));
  }

  public getSigner(signerOrPrivateKey: Signer | string): ethers.Signer {
    return (typeof signerOrPrivateKey === 'string')
      ? (
        signerOrPrivateKey.includes(' ')
          ? ethers.Wallet.fromMnemonic(signerOrPrivateKey).connect(this.provider)
          : new ethers.Wallet(signerOrPrivateKey).connect(this.provider)
      )
      : signerOrPrivateKey;
  }

  public async removeAllListeners(): Promise<void> {
    this.provider.removeAllListeners();
  }

  public generateWallet(nonce?: string): ethers.Wallet {
    const keyBuffer = crypto.createHash('md5').update(nonce ?? randomString(32)).digest();
    return ethers.Wallet.fromMnemonic(entropyToMnemonic(arrayify(keyBuffer)));
  }

  public async getMessageSignature(signerOrPrivateKey: Signer | string, message: string): Promise<string> {
    return await this.getSigner(signerOrPrivateKey).signMessage(message);
  }

  public checkMessageSignature(address: string, message: string, signature: string): boolean {
    return ethers.utils.verifyMessage(message, signature) === address;
  }

  private getContractFromCacheOrMiss(address: string, initializer: () => ethers.Contract): ethers.Contract {
    if (address in this.contractsCache)
      return this.contractsCache[address];
    return this.contractsCache[address] = initializer();
  }

}
