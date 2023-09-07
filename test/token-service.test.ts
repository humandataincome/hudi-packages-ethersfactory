import {BigDecimal} from "../src/utils/bigdecimal";
import {BSC_CONFIG, EvmFactory, TokenService} from "../src";


async function main() {
  const config = BSC_CONFIG;
  const tokenService = new TokenService(config);

  const res = await tokenService.doTransfer(
    '',
    BSC_CONFIG.addresses.tokens.HUDI,
    '',
    BigDecimal.fromString('', 0),
    true,
    true
  );
  console.log(res); //if undefined is correct
}
if (require.main === module) {
  (async () => {
    await main();
  })();
}
