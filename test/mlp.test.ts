import { ethers } from 'ethers';
import { BigDecimal, BSCTEST_CONFIG, EvmService, MiniLiquidityProviderService } from '../src';
import {MiniLiquidityProviderABI} from '../src/abis';

async function main() {

    const mlpService = new MiniLiquidityProviderService(BSCTEST_CONFIG);

    const privateKey = '54f32c6eba332abde55017c6da93fcb45e8cbca8ca4af43583651883a7f5bda6';
    const amount     = new BigDecimal(0.01)
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
            const percentageToRemove = 90
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
