import { BigDecimal, BSC_CONFIG, DexService, EvmService, ProxyUtilsService } from '../src';
import {ProxyUtilsABI} from '../src/abis';

async function main() {

    const proxyUtilsService = new ProxyUtilsService(BSC_CONFIG);
    const dexRouterService  = new DexService(BSC_CONFIG);
    const privateKey        = '';
    const amountsIn         = [new BigDecimal("0.0001")];
    const inputToken1       = "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1";
    const outPutToken1      = "0x83d8Ea5A4650B68Cd2b57846783d86DF940F7458";
    const amountOutMins     = [await dexRouterService.getSwapAmountOut(inputToken1, outPutToken1, amountsIn[0])]

    const paths = [[inputToken1, outPutToken1]]
    const slippage = 0.3
    const tos = [ '' ]

    try {
        await proxyUtilsService.doBatchSwapTokensForTokens(privateKey, amountsIn, amountOutMins, paths, [slippage], tos)
        process.exit(0)
    }
    catch(err:any) {
        if(err.tx) {
            console.log(err.message)
            const decodedTransaction = EvmService.decodeTransaction(err.tx, ProxyUtilsABI)
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
