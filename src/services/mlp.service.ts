import { Config } from '../config';
import { DexRouter02ABI, ERC20ABI, MiniLiquidityProviderABI} from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';
import { BigNumber } from 'ethers';

export class MiniLiquidityProviderService {
  private logger = new Logger(MiniLiquidityProviderService.name);
  private config: Config;
  private factory: EvmFactory;

  constructor(config: Config) {
    this.config = config;
    this.factory = new EvmFactory(config);
  }

  async getLPTokensOut(signerOrPrivateKey: Signer | string, amountToAdd: BigDecimal): Promise<BigDecimal> {
    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const result = await mlpContract.getLPTokensOut(amountToAdd.toBigNumber(18));
    this.logger.log('debug', `RESULT: ${result.toString()}`);
    return BigDecimal.fromBigNumber(result, 18);
  }

  async addLiquidity(signerOrPrivateKey: Signer | string, amountToAdd: BigDecimal): Promise<boolean> {
    if (amountToAdd.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }
    this.logger.log('debug', `AMOUNT TO ADD IS: ${amountToAdd.toString()}`);

    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const routerContract = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI).connect(signer);
    const lpTokenAddress = await mlpContract.getLpTokenAddress();
    const lpToken = this.factory.getContract(this.config.addresses.tokens.CAKELP, ERC20ABI).connect(signer);
    this.logger.log('debug', `LPTOKEN ADDRESS: ${lpTokenAddress}`);

    // CALCULATE THE MIN AMOUNT
    this.logger.log('debug', `GET THE MIN AMOUNTOUT`);
    const amountToSwap = amountToAdd.div(2);

    const amounts = await routerContract.getAmountsOut(amountToSwap, [this.config.addresses.tokens.WETH, this.config.addresses.tokens.HUDI]);
    this.logger.log('debug', `AMOUNTS: ${amounts.map((x:BigNumber) => x.toString())}`);

    const amountOutMin = amounts[1];
    this.logger.log('debug', `MIN AMOUNT OUT IS: ${amountOutMin.toString()}`);

    const deadline = Math.floor(Date.now() / 1000) + (60*10);//10 minutes

    try {
      this.logger.log('debug', `START TO ADD LIQUIDITY...`);
      const tx = await mlpContract.addLiquidity(amountOutMin, deadline, {value: amountToAdd})
      await tx.wait()
      this.logger.log('debug', 'DONE');
      this.logger.log('debug', `USER LP TOKEN BALANCE: ${(await lpToken.balanceOf(signer.getAddress())).toString()}`);
      return true
    } catch (err) {
      this.logger.log('debug', `addLiquidity ERROR: ${err}`);
      return false;
    }
  }

  async removeLiquidity(signerOrPrivateKey: Signer | string, amountToRemove: number, slippage: number): Promise<boolean> { // SLIPPAGE EXAMPLE: 0.99
    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const lpTokenAddress = await mlpContract.getLpTokenAddress();
    const lpToken = this.factory.getContract(lpTokenAddress, ERC20ABI).connect(signer);
    this.logger.log('debug', `LPTOKEN ADDRESS: ${lpTokenAddress}`);

    this.logger.log('debug', `AMOUNT TO REMOVE IS: ${amountToRemove.toString()}`);

    const userlpTokenAmount =  await lpToken.balanceOf(signer.getAddress());
    this.logger.log('debug', `USER LIQUIDITY AMOUNT IS: ${userlpTokenAmount.toString()}`);

    // CALCULATE THE POOL SHARE IN THE LIQUIDITY
    const lpTokenTotalSupply = await lpToken.totalSupply();
    this.logger.log('debug', `TOTAL LIQUIDITY SUPPLY: ${lpTokenTotalSupply.toString()}`);

    const amount1 = BigDecimal.fromBigNumber(userlpTokenAmount);
    const amount2 = BigDecimal.fromBigNumber(lpTokenTotalSupply);
    const poolShare = amount1.div(amount2).toPrecision(18);
    this.logger.log('debug', `USER POOL SHARE IS: ${poolShare.toString()}`);

    // CALCULATE THE AMOUNTS OF TOKEN0 AND TOKEN1 IN THE LIQUIDITY
    const reserves = await lpToken.getReserves();

    console.log('token0: ', await lpToken.token0());
    console.log('token1: ', await lpToken.token1());

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
      this.logger.log('debug', `START TO REMOVE LIQUIDITY...`);
      const tx = await mlpContract.removeLiquidity(userlpTokenAmount, amountTokenMin, amountETHMin, deadline)
      await tx.wait();
      this.logger.log('debug', `DONE.`);
      this.logger.log('debug', `USER LP TOKEN BALANCE: ${(await lpToken.balanceOf(signer.getAddress())).toString()}`);
      return true;
    } catch (err) {
      this.logger.log('debug', `removeLiquidity ERROR: ${err}`);
      return false;
    }
  }

  async getUserPoolShare(signer: Signer): Promise<string> {
     // GET THE CONTRACT INSTANCES
     const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
     const lpTokenAddress = await mlpContract.getLpTokenAddress();
     const lpToken = this.factory.getContract(lpTokenAddress, ERC20ABI).connect(signer);

    const userlpTokenAmount =  await lpToken.balanceOf(signer.getAddress());
    this.logger.log('debug', `USER LIQUIDITY AMOUNT IS: ${userlpTokenAmount.toString()}`);

    // CALCULATE THE POOL SHARE IN THE LIQUIDITY
    const lpTokenTotalSupply = await lpToken.totalSupply();
    this.logger.log('debug', `TOTAL LIQUIDITY SUPPLY: ${lpTokenTotalSupply.toString()}`);

    const amount1 = BigDecimal.fromBigNumber(userlpTokenAmount);
    const amount2 = BigDecimal.fromBigNumber(lpTokenTotalSupply);
    const poolShare = amount1.div(amount2).toPrecision(18);
    this.logger.log('debug', `USER POOL SHARE IS: ${poolShare.toString()}`);

    return poolShare
  }
}
