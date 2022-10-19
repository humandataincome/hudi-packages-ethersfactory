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

    const tokenService = new TokenService(CONFIG);

    // TEST DEPOSIT
    const txHash = await treasuryService.deposit(
      USER_PRIVATE_KEY,
      amountToDeposit,
    );

    console.log('TRANSACTION HASH:', txHash);

    console.log(
      'CONTRACT BALANCE',
      await tokenService.getBalance(
        CONFIG.addresses.treasury,
        CONFIG.addresses.tokens.HUDI,
      ),
    );

    // READ DEPOSIT ARGUMENTS FROM THE TRANSACTION
    const args = await treasuryService.decodeDepositByTxHash(
      '0xf63fe162022df2e165db0ddc45640332024acddd29670a83379a7d590ee70a4b',
    );
    console.log('DEPOSIT ARGS', args);

    // PREPARE SIGNE MESSAGE TO PASS TO THE CONTRACT
    const id = 4;
    const deadline = Math.floor((Date.now() + 86400000) / 1000); //ADD 1 DAY
    const token = await treasuryService.encodeWithdrawToken(
      USER_PRIVATE_KEY,
      id,
      TRUTH_HOLDER_PRIVATE_KEY,
      amountToDeposit,
      deadline,
    );
    console.log('TOKEN', token);

    // TEST WITHDRAW
    await treasuryService.withdraw(USER_PRIVATE_KEY, token);

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
