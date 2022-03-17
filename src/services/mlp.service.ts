import { Config } from '../config';
import { DexRouter02ABI, ERC20ABI, MiniLiquidityProviderABI, PancakeSwapLockerABI } from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';
import { BigNumber } from 'ethers';

export interface TokenLock {
  lockDate: Date;// the date the token was locked
  amount: BigNumber; // the amount of tokens still locked (initialAmount minus withdrawls)
  initialAmount: BigNumber;  // the initial lock amount
  unlockDate: Date; // the date the token can be withdrawn
  lockID: BigNumber; // lockID nonce per uni pair
  owner: string;
}

export class MiniLiquidityProviderService {
  private logger = new Logger(MiniLiquidityProviderService.name);
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  async lock(signerOrPrivateKey: Signer | string, amountToLock: BigDecimal): Promise<boolean> {
    if (amountToLock.lt(0)) {
      throw new Error('LOCK AMOUN MUST BE GREATHER THAN 0');
    }

    const amountToSwap = amountToLock.div(2);

    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const WETHToken = this.factory.getContract(this.config.addresses.tokens.WETH, ERC20ABI).connect(signer);
    const LPTokenContract = this.factory.getContract(this.config.addresses.tokens.CAKELP, ERC20ABI).connect(signer);
    const routerContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI).connect(signer);

    // CALCULATE THE MIN AMOUNT
    const amounts = await routerContract.getAmountsOut(amountToSwap, [WETHToken.address, this.config.addresses.tokens.HUDI]) as BigNumber[];
    this.logger.log('debug', `AMOUNTS: ${amounts.map(x => x.toString())}`);

    const amountOutMin = amounts[1];
    this.logger.log('debug', `MIN AMOUNT OUT IS: ${amountOutMin.toString()}`);

    // CHECK ALLOWANCES
    this.logger.log('debug', 'CHECK ALLOWANCES FOR MLP CONTRACT TO MANAGE LPTOKEN OF CURRENT USER ..');
    const allowance = await LPTokenContract.allowance(signer.getAddress(), mlpContract.address);
    if (allowance.lt(ethers.constants.MaxUint256)) {
      await LPTokenContract.approve(mlpContract.address, ethers.constants.MaxUint256);
      this.logger.log('debug', 'APPROVED LPTOKEN ALLOWANCE!');
    } else {
      this.logger.log('debug', 'ALLOWANCE LPTOKEN ALREADY APPROVED!');
    }

    const deadline = Math.floor(Date.now() / 1000) + (60 * 10);//10 minutes

    try {
      // EXECUTE LOCK
      this.logger.log('debug', 'START TO LOCK...');
      const tx = await mlpContract.lock(amountOutMin, deadline, { value: amountToLock });
      await tx.wait();
      this.logger.log('debug', 'DONE.');
      const totalValueLocked = await mlpContract.getTotalValueLocked() as BigNumber[];
      this.logger.log('info', `TOTAL VALUE LOCKED: ${totalValueLocked.map(x => x.toString())}`);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  async unLock(signerOrPrivateKey: Signer | string, lockIndex: number, slippage: number): Promise<boolean> { // SLIPPAGE EXAMPLE: 0.99
    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const LPToken = this.factory.getContract(this.config.addresses.tokens.CAKELP, ERC20ABI).connect(signer);
    const lpTokenAddress = await mlpContract.getLpTokenAddress();

    // GET THE LIQUIDITY LOCKED IN THE LOCKER BY INDEX
    const userLock = await this.getUserLockForTokenAtIndex(signerOrPrivateKey, lpTokenAddress, lockIndex);
    const totalLockAmount = userLock.amount;

    this.logger.log('debug', `TOTAL LOCKED AMOUN: ${totalLockAmount.toString()}`);
    this.logger.log('debug', `USER LOCK: ${userLock}`);

    const amountToUnlock = totalLockAmount;
    this.logger.log('debug', `AMOUNT TO UNLOCLOCK IS: ${amountToUnlock.toString()}`);

    const userlpTokenAmount = totalLockAmount;
    this.logger.log('debug', `USER LIQUIDITY AMOUNT IS: ${totalLockAmount.toString()}`);

    // CALCULATE THE POOL SHARE IN THE LIQUIDITY
    const lpTokenTotalSupply = await LPToken.totalSupply();
    this.logger.log('debug', `TOTAL LIQUIDITY SUPPLY: ${lpTokenTotalSupply.toString()}`);

    const amount1 = BigDecimal.fromBigNumber(userlpTokenAmount);
    const amount2 = BigDecimal.fromBigNumber(lpTokenTotalSupply);
    const poolShare = amount1.div(amount2).toPrecision(18);
    this.logger.log('debug', `USER POOL SHARE IS: ${poolShare.toString()}`);

    // CALCULATE THE AMOUNTS OF TOKEN0 AND TOKEN1 IN THE LIQUIDITY
    const reserves = await LPToken.getReserves();

    console.log('token0: ', await LPToken.token0());
    console.log('token1: ', await LPToken.token1());

    this.logger.log('debug', `HUDI POOL RESERVE AMOUNT IS: ${reserves[0].toString()}`);
    this.logger.log('debug', `BNB POOL RESERVE AMOUNT IS: ${reserves[1].toString()}`);

    const reserveHUDI = BigDecimal.fromBigNumber(reserves[0]);
    const reserveBNB = BigDecimal.fromBigNumber(reserves[1]);

    const userBNBPoolAmount = ((reserveBNB.mul(poolShare)).mul(slippage)).floor();
    const userHUDIPoolAmount = ((reserveHUDI.mul(poolShare)).mul(slippage)).floor();

    this.logger.log('debug', `USER BNB POOL AMOUNT IS: ${userBNBPoolAmount.toString()}`);
    this.logger.log('debug', `USER HUDI POOL AMOUNT IS: ${userHUDIPoolAmount.toString()}`);

    const amountTokenMin = ethers.BigNumber.from(userHUDIPoolAmount.toString());
    const amountETHMin = ethers.BigNumber.from(userBNBPoolAmount.toString());

    const deadline = Math.floor(Date.now() / 1000) + (60 * 10);//10 minutes

    try {
      this.logger.log('debug', `START TO UNLOCK...`);
      const tx = await mlpContract.unlock(lockIndex, amountToUnlock, amountTokenMin, amountETHMin, deadline);
      await tx.wait();
      this.logger.log('debug', `DONE.`);
      const totalValueLocked = await mlpContract.getTotalValueLocked();
      this.logger.log('info', `TOTAL VALUE LOCKED: ${totalValueLocked.map((x: BigNumber) => x.toString())}`);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  async getNumLocksForToken(signerOrPrivateKey: Signer | string, lpToken: string): Promise<BigNumber> {
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const lockerContract = this.factory.getContract(this.config.addresses.pancakeSwapLocker, PancakeSwapLockerABI).connect(signer);
    return await lockerContract.getNumLocksForToken(lpToken);
  }

  async getUserPoolShare(signer: Signer, lockIndex: number, userLock?: TokenLock): Promise<string> {

    if (!userLock) {
      const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
      const lpTokenAddress = await mlpContract.getLpTokenAddress();

      // GET THE LIQUIDITY LOCKED IN THE LOCKER BY INDEX
      userLock = await this.getUserLockForTokenAtIndex(signer, lpTokenAddress, lockIndex);
    }

    const totalLockAmount = userLock.amount;

    this.logger.log('debug', `TOTAL LOCKED AMOUN: ${totalLockAmount.toString()}`);
    this.logger.log('debug', `USER LOCK: ${userLock}`);

    const userlpTokenAmount = totalLockAmount;
    this.logger.log('debug', `USER LIQUIDITY AMOUNT IS: ${totalLockAmount.toString()}`);

    // CALCULATE THE POOL SHARE IN THE LIQUIDITY
    const LPToken = this.factory.getContract(this.config.addresses.tokens.CAKELP, ERC20ABI).connect(signer);
    const lpTokenTotalSupply = await LPToken.totalSupply();
    this.logger.log('debug', `TOTAL LIQUIDITY SUPPLY: ${lpTokenTotalSupply.toString()}`);

    const amount1 = BigDecimal.fromBigNumber(userlpTokenAmount);
    const amount2 = BigDecimal.fromBigNumber(lpTokenTotalSupply);
    const poolShare = amount1.div(amount2).toPrecision(18);
    this.logger.log('debug', `USER POOL SHARE IS: ${poolShare.toString()}`);

    return poolShare;
  }

  async getUserLockForTokenAtIndex(signerOrPrivateKey: Signer | string, lpToken: string, index: number): Promise<TokenLock> {
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const lockerContract = this.factory.getContract(this.config.addresses.pancakeSwapLocker, PancakeSwapLockerABI).connect(signer);
    const userLock = await lockerContract.getUserLockForTokenAtIndex(signer.getAddress(), lpToken, index);
    const poolShare = await this.getUserPoolShare(signer, index, userLock);
    return {
      lockDate: userLock[0],
      amount: userLock[1],
      initialAmount: userLock[2],
      unlockDate: userLock[3],
      lockID: userLock[4],
      owner: userLock[6],
      poolShare,
    } as TokenLock;
  }
}
