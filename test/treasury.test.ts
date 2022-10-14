import { utils } from 'ethers';
import {
  BigDecimal,
  BSC_CONFIG,
  BSCTEST_CONFIG,
  EvmService,
  TokenService,
} from '../src';
import { TreasuryABI } from '../src';
import { TreasuryService } from '../src';

const isTestnet = true;
const CONFIG = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;

const USER_PRIVATE_KEY = isTestnet ? '' : '';

const TRUTH_HOLDER_PRIVATE_KEY = isTestnet ? '' : '';

async function main() {
  try {
    const treasuryService = new TreasuryService(
      CONFIG,
      CONFIG.addresses.treasury,
    );

    const amountToDeposit = new BigDecimal(
      BigDecimal.fromBigNumber(utils.parseEther('0.01'), 18),
    );

    // TEST DEPOSIT
    const tokenService = new TokenService(CONFIG);
    await treasuryService.deposit(USER_PRIVATE_KEY, amountToDeposit);

    console.log(
      'CONTRACT BALANCE',
      await tokenService.getBalance(
        CONFIG.addresses.treasury,
        CONFIG.addresses.tokens.HUDI,
      ),
    );

    // TEST CLAIM
    const id = 2;
    const deadline = Math.floor((Date.now() + 86400000) / 1000);
    await treasuryService.claim(
      USER_PRIVATE_KEY,
      TRUTH_HOLDER_PRIVATE_KEY,
      id,
      amountToDeposit,
      deadline,
    );

    console.log(
      'CONTRACT BALANCE',
      await tokenService.getBalance(
        CONFIG.addresses.treasury,
        CONFIG.addresses.tokens.HUDI,
      ),
    );

    process.exit(0);
  } catch (err: any) {
    if (err.tx) {
      console.log(err.message);
      const decodedTransaction = EvmService.decodeTransaction(
        err.tx,
        TreasuryABI,
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
