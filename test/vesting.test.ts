import { utils } from 'ethers';
import { BigDecimal, BSC_CONFIG, BSCTEST_CONFIG, EvmService } from '../src';
import { VestingABI } from '../src';
import { VestingService } from '../src';

const isTestnet = true;
const CONFIG = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;

const VESTING_CREATOR_PRIVATE_KEY = isTestnet ? '' : '';
const DESTINATION_WALLET_ADDRESS = '';
const DESTINATION_WALLET_PRIVATE_KEY = isTestnet ? '' : '';

async function main() {
  try {
    const vestingService = new VestingService(CONFIG);

    // CREATE VESTING
    const totalLockedValue = new BigDecimal(
      BigDecimal.fromBigNumber(utils.parseEther('0.5'), 18),
    );
    const releaseValue = BigDecimal.fromBigNumber(utils.parseEther('0.1'), 18); // tokens
    const releasePeriod = 2592000000; // 30 days
    const cliffPeriod = 7776000000; // 90 days
    const startTimestamp = 1609459200000; // 1 January 2022 00:00:00

    await vestingService.createVesting(
      VESTING_CREATOR_PRIVATE_KEY,
      DESTINATION_WALLET_ADDRESS,
      totalLockedValue,
      releaseValue,
      releasePeriod,
      cliffPeriod,
      startTimestamp,
    );

    // GET THE ID OF THE CREATED VESTING
    const vestingIds = await vestingService.getVestingIds(
      DESTINATION_WALLET_PRIVATE_KEY,
      DESTINATION_WALLET_ADDRESS,
    );
    console.log('vestingIds', vestingIds);
    const vestingid = vestingIds.length - 1;

    // GET THE CREATED VESTING
    const vesting = await vestingService.getVesting(
      DESTINATION_WALLET_PRIVATE_KEY,
      vestingIds[vestingid],
    );
    console.log('vesting', vesting);

    // GET THE CLAIMABLE AMOUNT
    const amount = await vestingService.getClaimableAmount(
      DESTINATION_WALLET_PRIVATE_KEY,
      vestingIds[vestingid],
    );

    console.log('claimableAmount', amount);

    if (amount.gt(0)) {
      // CLAIM THE AMOUNT
      console.log('START TO CLAIM THE VESTING...');
      await vestingService.claimVesting(
        DESTINATION_WALLET_PRIVATE_KEY,
        vestingIds[vestingid],
      );
      console.log('VESTING CLAIMED.');
    } else {
      console.log('THIS VESTING IS NOT CLAIMABLE YET');
    }

    process.exit(0);
  } catch (err: any) {
    if (err.tx) {
      console.log(err.message);
      const decodedTransaction = EvmService.decodeTransaction(
        err.tx,
        VestingABI,
      );
      console.log(decodedTransaction);
      process.exit(1);
    } else {
      console.log(err);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
