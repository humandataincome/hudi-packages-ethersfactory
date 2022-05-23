import {utils} from 'ethers';
import { BigDecimal, BSC_CONFIG, BSCTEST_CONFIG, EvmService} from '../src';
import {StakingABI} from '../src';
import { StakingService } from '../src';

const isTestnet          = true;
const CONFIG             = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;
const USER_PRIVATE_KEY   = isTestnet ? '4118c712962d9cb0cc9abb9b5ae3f5a54350847beb29e48923e5974eacd43cc3' : '0xf6f22a1637ed44cbbfda66aaa15d471bddb2703613749683e3971f14e4416b86';
async function main() {

    const stakingService = new StakingService(CONFIG, CONFIG.addresses.stakingLPToken);
    const amountToStake  = new BigDecimal(BigDecimal.fromBigNumber(utils.parseEther('0.02'), 18));
    try {
        // // GET STAKING APR
        await stakingService.getAnnualPercentageRate();

        // GET STAKING MIN AMOUNT
        await stakingService.getStakingMinAmount();

        // GET STAKING MAX AMOUNT
        await stakingService.getStakingMaxAmount();

        // GET WITHDRAW LOCK PERIOD
        await stakingService.getWithdrawLockPeriod();

        // GET STAKING TOTAL SUPPLY
        let totalsupply = await stakingService.getStakingTotalSupply();

        // GET STAKE
        let stake = await stakingService.getStakeInfo(USER_PRIVATE_KEY);
        console.log('STAKE', stake)

        // STAKE
        await stakingService.stake(USER_PRIVATE_KEY, amountToStake)

        // GET STAKING TOTAL SUPPLYS
        totalsupply = await stakingService.getStakingTotalSupply();

        // GET STAKE
        stake = await stakingService.getStakeInfo(USER_PRIVATE_KEY);
        console.log('STAKE', stake)

        // GET REWARDS EARNED
        const earned = await stakingService.getRewardsEarned(USER_PRIVATE_KEY);

        // WITHDRAW
        const amountToWithDraw  = new BigDecimal(BigDecimal.fromBigNumber(utils.parseEther('0.01'), 18))
        await stakingService.withdraw(USER_PRIVATE_KEY, amountToWithDraw)

        // GET STAKE
        stake = await stakingService.getStakeInfo(USER_PRIVATE_KEY);
        console.log('STAKE', stake?.balance)

        // WITHDRAW and CLAIM
        await stakingService.withdrawAndClaim(USER_PRIVATE_KEY)

        // GET STAKING TOTAL SUPPLYS
        totalsupply = await stakingService.getStakingTotalSupply();
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
