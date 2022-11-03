import {ethers, utils} from 'ethers';
import { BigDecimal, BSC_CONFIG, BSCTEST_CONFIG, EvmService, MiniLiquidityProviderService } from '../src';
import {MiniLiquidityProviderABI} from '../src/abis';
import Decimal from "decimal.js";

const isTestnet     = false;
const CONFIG        = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;
const PRIVATE_KEY   = isTestnet ? '' : '';

async function main() {

    const mlpService = new MiniLiquidityProviderService(CONFIG);

    const privateKey = PRIVATE_KEY;
    const amount     = new BigDecimal(BigDecimal.fromBigNumber(utils.parseEther('0.02'), 18).toFixed(4, Decimal.ROUND_DOWN))
    try {
        // getLPTokensOut - projection of the lptoken ernead
        const resultGetLPTokensOut = await mlpService.getLPTokensOut(privateKey, amount);
        console.log('TEST getLPTokensOut - RESULT', resultGetLPTokensOut)

        // add amount to a liquidity pool
        const resultAddLiquidity = await mlpService.addLiquidity(privateKey, amount);
        console.log('TEST addLiquidity - RESULT', resultAddLiquidity)

        if(resultAddLiquidity) {
            // remove liquidity from a pool
            const slippage = 0.3;
            const percentageToRemove = 0.9
            const resultRemoveLiquidity = await mlpService.removeLiquidity(privateKey, percentageToRemove, slippage)
            console.log('TEST removeLiquidity - RESULT', resultRemoveLiquidity)
        }
        process.exit(0)
    }
    catch(err:any) {
        if(err.tx) {
            console.log(err.message)
            const decodedTransaction = EvmService.decodeTransaction(err.tx, MiniLiquidityProviderABI)
            console.log(decodedTransaction)
            process.exit(1)
        } else {
            console.log(err)
            process.exit(1)
        }
    }
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
