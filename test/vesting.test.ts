import { utils } from 'ethers';
import { BigDecimal, BSC_CONFIG, BSCTEST_CONFIG, EvmService } from '../src';
import { VestingABI } from '../src';
import { VestingService } from '../src';

const isTestnet = true;
const CONFIG = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;
const USER_PRIVATE_KEY = isTestnet
  ? '0x37760c9680908cf409bdc63a9dda46ed4f9b6eeedf543554cefd202704cab4f0'
  : '';
const DESTINATION_WALLET_ADDRESS = '0x509303FcEF45e385B1E143eB8D46367c821CcfE2';

async function main() {
  try {
    const vestingService = new VestingService(CONFIG, CONFIG.addresses.vesting);

    // CREATE VESTING
    const totalLockedValue = new BigDecimal(
      BigDecimal.fromBigNumber(utils.parseEther('0.5'), 18),
    );
    const releaseValue = BigDecimal.fromBigNumber(utils.parseEther('0.1'), 18); // tokens
    const releasePeriod = 2592000000; // 30 days
    const cliffPeriod = 7776000000; // 90 days
    const startTimestamp = 1672531200000; // Sunday 1 January 2023 00:00:00

    await vestingService.createVesting(
      USER_PRIVATE_KEY,
      DESTINATION_WALLET_ADDRESS,
      totalLockedValue,
      releaseValue,
      releasePeriod,
      cliffPeriod,
      startTimestamp,
    );

    // // GET THE ID OF THE CREATED VESTING
    // const vestingIds = await vestingService.getVestingIds(USER_PRIVATE_KEY);
    // console.log('vestingIds', vestingIds);

    // // GET THE VESTING CREATED
    // const vestingId = vestingIds[0];
    // const vesting = await vestingService.getVesting(
    //   USER_PRIVATE_KEY,
    //   vestingId,
    // );
    // console.log('vesting', vesting);

    // // GET THE CLAIMABLE AMOUNT
    // const amount = await vestingService.getClaimableAmount(
    //   USER_PRIVATE_KEY,
    //   vestingId,
    // );
    // console.log('claimableAmount', amount);

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
