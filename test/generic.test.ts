import { BigDecimal, BSCTEST_CONFIG, DexInfoService, ProxyUtilsService } from '../src';

async function main() {
  //await new ProxyUtilsService(BSCTEST_CONFIG).doBatchTransferToken('0xe19e27b2ca85b6761abe2687af3fc4cd7ab0dd563a5064f98ee540617e1bbef9', '0xf13790CEf6be38817366cb9B36E95D16eb024c00', ['0x3710d02a3c9E35aab7486a058a880193903EFB9B'], [new BigDecimal(23)])
  console.log(await new DexInfoService(BSCTEST_CONFIG).getPairInfo('0x9428d7f0660b1ec8e42930c08443880f8f663875', 30));
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}
