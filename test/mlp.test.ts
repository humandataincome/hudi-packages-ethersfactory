import { ethers } from 'ethers';
import { BigDecimal, BSCTEST_CONFIG, EvmService, MiniLiquidityProviderService } from '../src';
import {MiniLiquidityProviderABI} from '../src/abis';

async function main() {

    const mlpService = new MiniLiquidityProviderService(BSCTEST_CONFIG);

    const privateKey = '';
    const amount     = BigDecimal.fromBigNumber(ethers.utils.parseEther("0.01"))

    try {
        await mlpService.getLPTokensOut(privateKey, amount)
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
