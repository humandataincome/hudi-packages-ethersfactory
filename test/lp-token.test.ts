import { BSCTEST_CONFIG, BSC_CONFIG, LPTokenService } from '../src';
const isTestnet          = false;
const CONFIG             = isTestnet ? BSCTEST_CONFIG : BSC_CONFIG;

async function main() {
  const lptokeService = new LPTokenService(CONFIG);
  const token1 = CONFIG.addresses.tokens.WBNBHUDI;
  const token2 = CONFIG.addresses.tokens.HUDI;
  const result = await lptokeService.getTokensRatio(token1, token2);
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
