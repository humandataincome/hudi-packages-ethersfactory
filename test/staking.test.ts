import {utils} from 'ethers';
import { BigDecimal, BSC_CONFIG, BSCTEST_CONFIG, EvmService} from '../src';
import {StakingABI} from '../src/abis';
import { StakingService } from '../src/services/staking.service';

const isTestnet     = true;
const CONFIG        = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;
const PRIVATE_KEY   = isTestnet ? '' : '';

async function main() {

    const stakingService = new StakingService(CONFIG);

    const privateKey     = PRIVATE_KEY;
    const amountToStake  = new BigDecimal(BigDecimal.fromBigNumber(utils.parseEther('0.02')))
    try {
        // STAKE
        let result = await stakingService.stake(privateKey, amountToStake)
        console.log('STAKE RESULT:', result)
        
        // GET STAKE
        const stake = await stakingService.getStake(privateKey); 
        console.log('STAKE', stake)

        // WITHDRAW and CLAIM
        result = await stakingService.withdrawAndClaim(privateKey)
        console.log('WITHDRAW and CLAIM RESULT', result)

        process.exit(0)
    }
    catch(err:any) {
        if(err.tx) {
            console.log(err.message)
            const decodedTransaction = EvmService.decodeTransaction(err.tx, StakingABI)
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
