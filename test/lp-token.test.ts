import { BSCTEST_CONFIG, BSC_CONFIG, LPTokenService } from '../src';
const isTestnet          = true;
const CONFIG             = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;

async function main() {
  const lptokeService = new LPTokenService(CONFIG);
  const token1 = '0xED645e63B27E2b8420154e2a38Df922684571fe0'; //WBNB/HUDI Testnet
  const token2 = BSCTEST_CONFIG.addresses.tokens.HUDI;
  const result = await lptokeService.getTokensRatio(token1, token2);
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
