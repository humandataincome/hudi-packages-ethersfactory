import { Config } from '../config';
import {DexPairABI, DexRouter02ABI, ERC20ABI, MiniLiquidityProviderABI} from '../abis';
import { BigDecimal } from '../utils/bigdecimal';
import { Signer } from '@ethersproject/abstract-signer';
import { EvmFactory } from './evm.factory';
import Logger from '../utils/logger';
import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import Decimal from "decimal.js";

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

  async getLPTokenAddress(): Promise<string> {
    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI);
    return await mlpContract.getLpTokenAddress();
  }

  async addLiquidity(signerOrPrivateKey: Signer | string, amountToAdd: BigDecimal): Promise<boolean> {
    if (amountToAdd.lt(0)) {
      throw new Error('AMOUNT MUST BE GREATHER THAN 0');
    }
    // TODO: Ask to Andrea (help us)
    amountToAdd = new BigDecimal(amountToAdd.toFixed(3, Decimal.ROUND_DOWN));

    this.logger.log('debug', `AMOUNT TO ADD IS: ${amountToAdd.toString()}`);

    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract     = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const routerContract  = this.factory.getContract(this.config.addresses.dexRouter, DexRouter02ABI).connect(signer);
    const lpTokenAddress  = await mlpContract.getLpTokenAddress();
    const lpToken         = this.factory.getContract(this.config.addresses.tokens.CAKELP, ERC20ABI).connect(signer);
    const WETH            = await routerContract.WETH();
    const HUDI            = this.config.addresses.tokens.HUDI

    this.logger.log('debug', `WETH ADDRESS: ${WETH}`);
    this.logger.log('debug', `HUDI ADDRESS: ${HUDI}`);
    this.logger.log('debug', `LPTOKEN ADDRESS: ${lpTokenAddress}`);

    // CALCULATE THE MIN AMOUNT
    const amountToSwap = new BigDecimal(amountToAdd).div(2);
    this.logger.log('debug', `amountToAdd ${amountToAdd.toBigNumber(18).toString()}`, )

    const amounts: BigNumber[] = await routerContract.getAmountsOut(amountToSwap.toBigNumber(18), [WETH, HUDI]);
    this.logger.log('debug', `AMOUNTS: ${amounts.map((x: BigNumber) => x.toString())}`);

    const amountOutMin = amounts[1];
    this.logger.log('debug', `MIN AMOUNT OUT IS: ${amountOutMin.toString()}`);

    const deadline = Math.floor(Date.now() / 1000) + (60*10);//10 minutes

    try {
      this.logger.log('debug', `START TO ADD LIQUIDITY... `);
      this.logger.log('debug', `ARGS: amountOutMin: ${amountOutMin.toString()}, deadline: ${deadline.toString()}, value: ${amountToAdd.toBigNumber(18).toString()}`);
      const tx = await mlpContract.connect(signer).addLiquidity(amountOutMin, deadline, {value: amountToAdd.toBigNumber(18)})
      await tx.wait()
      this.logger.log('debug', 'DONE');

      return true
    } catch (err) {
      this.logger.log('debug', `addLiquidity ERROR: ${err}`);
      return false;
    }
  }

  async removeLiquidity(signerOrPrivateKey: Signer | string, percentage: number, slippage = 0.001): Promise<boolean> {

    // GET THE CONTRACT INSTANCES
    const signer          = this.factory.getSigner(signerOrPrivateKey);
    const mlpContract     = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const lpTokenAddress =  await mlpContract.getLpTokenAddress();
    const lpToken         = new ethers.Contract(lpTokenAddress, DexPairABI, signer);
    const signerAddress   = await signer.getAddress()

    this.logger.log('debug', `SIGNER ADDRESS: ${signerAddress}`);
    this.logger.log('debug', `LPTOKEN ADDRESS: ${lpTokenAddress}`);
    this.logger.log('debug', `AMOUNT LPTOKEN PERCENTAGE TO REMOVE IS: ${percentage}%`);

    const userlpTokenAmount: BigNumber =  await lpToken.balanceOf(signerAddress);
    this.logger.log('debug', `USER LPTOKEN BALANCE IS: ${userlpTokenAmount.toString()}`);

    if(userlpTokenAmount.lte(0)) {
      throw new Error('USER LPTOKEN BALANCE IS 0');
    }

    // CALCULATE THE POOL SHARE IN THE LIQUIDITY
    const lpTokenTotalSupply: BigNumber = await lpToken.totalSupply();
    this.logger.log('debug', `LPTOKEN TOTAL SUPPLY: ${lpTokenTotalSupply.toString()}`);

    const userlpTokenAmountBigDecimal = BigDecimal.fromBigNumber(userlpTokenAmount, 18);
    const lpTokenTotalSupplyBigDecimal = BigDecimal.fromBigNumber(lpTokenTotalSupply, 18);

    const poolShare = userlpTokenAmountBigDecimal.div(lpTokenTotalSupplyBigDecimal).toPrecision(18);
    this.logger.log('debug', `USER POOL SHARE IS: ${poolShare.toString()}`);

    // CALCULATE THE USER AMOUNTS OF TOKEN0 AND TOKEN1 IN THE LIQUIDITY
    const reserves: BigNumber[]  = await lpToken.getReserves();
    this.logger.log('debug', `TOKEN ADDRESS IS: ${await lpToken.token0()}`);
    this.logger.log('debug', `BNB ADDRESS IS: ${await lpToken.token1()}`);

    this.logger.log('debug', `TOKEN POOL RESERVE AMOUNT IS: ${reserves[0].toString()}`);
    this.logger.log('debug', `BNB POOL RESERVE AMOUNT IS: ${reserves[1].toString()}`);

    const reserveHUDI = BigDecimal.fromBigNumber(reserves[0], 18);
    const reserveBNB = BigDecimal.fromBigNumber(reserves[1], 18);

    this.logger.log('debug', `SLIPPAGE IS: ${slippage}`);
    const userBNBPoolAmount = reserveBNB.mul(poolShare).mul(slippage);
    const userHUDIPoolAmount = reserveHUDI.mul(poolShare).mul(slippage);

    this.logger.log('debug', `USER BNB POOL AMOUNT IS: ${userBNBPoolAmount.toBigNumber(18).toString()}`);
    this.logger.log('debug', `USER TOKEN POOL AMOUNT IS: ${userHUDIPoolAmount.toBigNumber(18).toString()}`);

    // VALUES TO PASS TO THE REMOVELIQUIDITY FUNCTION
    const amountToRemove  = userlpTokenAmountBigDecimal.mul(percentage).toBigNumber(18)
    const amountTokenMin  = userHUDIPoolAmount.mul(percentage).toBigNumber(18);
    const amountETHMin    = userBNBPoolAmount.mul(percentage).toBigNumber(18);

    this.logger.log('debug', `AMOUNT TO REMOVE IS: ${amountToRemove.toString()}`);
    this.logger.log('debug', `AMOUNT TOKEN MIN IS: ${amountTokenMin.toString()}`);
    this.logger.log('debug', `AMOUNT ETH MIN IS: ${amountETHMin.toString()}`);

    // APPROVE THE CONTRACT TO SPEND LPTOKENS
    const allowance = await lpToken.allowance(signerAddress, this.config.addresses.miniLiquidityProvider)
    this.logger.log('debug', `CONTRACT ALLOWANCE FOR LPTOKEN IS: ${allowance.toString()}`);
    if(allowance.lt(amountToRemove)) {
      await (await lpToken.connect(signer).approve(this.config.addresses.miniLiquidityProvider, ethers.constants.MaxUint256)).wait();
      this.logger.log('debug', `CONTRACT APPROVED TO SPEND LPTOKENS`);
    }

    const deadline = Math.floor(Date.now() / 1000) + (60 * 10);//10 minutes

    try {
      this.logger.log('debug', `START TO REMOVE LIQUIDITY...`);
      const tx = await mlpContract.connect(signer).removeLiquidity(amountToRemove, amountTokenMin, amountETHMin, deadline)
      await tx.wait();
      this.logger.log('debug', `DONE.`);
      this.logger.log('debug', `USER LP TOKEN BALANCE: ${(await lpToken.balanceOf(signerAddress)).toString()}`);
      return true;
    } catch (err) {
      this.logger.log('debug', `removeLiquidity ERROR: ${err}`);
      return false;
    }
  }

  async getUserLpToken(signerOrPrivateKey: Signer | string) {
    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);

    const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
    const lpTokenAddress = await mlpContract.getLpTokenAddress();
    const lpToken = this.factory.getContract(lpTokenAddress, ERC20ABI).connect(signer);
    const decimals = await lpToken.decimals();
    return BigDecimal.fromBigNumber(await lpToken.balanceOf(signer.getAddress()), decimals);
  }

  async getUserPoolShare(signerOrPrivateKey: Signer | string): Promise<string> {
    // GET THE CONTRACT INSTANCES
    const signer = this.factory.getSigner(signerOrPrivateKey);

     // GET THE CONTRACT INSTANCES
     const mlpContract = this.factory.getContract(this.config.addresses.miniLiquidityProvider, MiniLiquidityProviderABI).connect(signer);
     const lpTokenAddress = await mlpContract.getLpTokenAddress();
     const lpToken = this.factory.getContract(lpTokenAddress, ERC20ABI).connect(signer);

    const userlpTokenAmount =  await lpToken.balanceOf(signer.getAddress());
    this.logger.log('debug', `USER LPTOKEN BALANCE IS: ${userlpTokenAmount.toString()}`);

    // CALCULATE THE POOL SHARE IN THE LIQUIDITY
    const lpTokenTotalSupply = await lpToken.totalSupply();
    this.logger.log('debug', `LPTOKEN TOTAL SUPPLY: ${lpTokenTotalSupply.toString()}`);

    const amount1 = BigDecimal.fromBigNumber(userlpTokenAmount);
    const amount2 = BigDecimal.fromBigNumber(lpTokenTotalSupply);
    const poolShare = amount1.div(amount2).toPrecision(18);
    this.logger.log('debug', `USER POOL SHARE IS: ${poolShare.toString()}`);

    return poolShare
  }
}
