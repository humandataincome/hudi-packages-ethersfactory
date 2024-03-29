import {BigDecimal} from "../src/utils/bigdecimal";
import {BSC_CONFIG, TokenService} from "../src";

async function main() {
  const tokenService = new TokenService(BSC_CONFIG);

  const res = await tokenService.doTransfer(
    '',
    BSC_CONFIG.addresses.tokens.HUDI,
    '',
    BigDecimal.fromString('', 0),
    true,
  );
  console.log(res); //if undefined is correct
}
if (require.main === module) {
  (async () => {
    await main();
  })();
}
