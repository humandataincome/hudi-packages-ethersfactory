import {BSC_CONFIG, ProxyUtilsService} from "../src";
import {BigDecimal} from "../src/utils/bigdecimal";

async function main() {
  const proxyService = new ProxyUtilsService(BSC_CONFIG);
  const res = await proxyService.doBatchTransferToken(
    '',
    BSC_CONFIG.addresses.tokens.HUDI,
    ['', ''],
    [BigDecimal.fromString('20', 0), BigDecimal.fromString('10', 0)],
    true,
  );
  console.log(res); //if undefined is correct
}
if (require.main === module) {
  (async () => {
    await main();
  })();
}
