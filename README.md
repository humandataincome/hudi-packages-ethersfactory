# hudi-packages-ethersfactory


## How to install

### Installing with npm
For more information on using `npm` check out the docs <a href="https://docs.npmjs.com/cli/install" target="_blank">here</a>.
```sh
npm i @humandataincome/ethersfactory
```

### Installing with yarn
For more information on using `yarn` check out the docs <a href="https://yarnpkg.com/getting-started/usage#installing-all-the-dependencies" target="_blank">here</a>.

```
yarn add @humandataincome/ethersfactory
```


## How to use
There are several services you can use:
* **DexService**.
* **EvmService**.
* **MLPService**.
* **MLPService**.
* **ProxyUtilsService**.
* **TokenService**.

There are three basic configurations you can use:
* **BSC_CONFIG**. Allows you to make transactions on the Binance Smart Chain Mainnet.
* **BSCTEST_CONFIG**. Allows you to make transactions on the Binance Smart Chain Testnet.
* **ETH_CONFIG1**. Allows you to make transactions on the Ethereum Mainnet.

In this way:
```ts
import { BSC_CONFIG, TokenService } from "@humandataincome/ethersfactory";

const tokenService = new TokenService(BSC_CONFIG);

```

If you want to connect to Ethereum Mainnet, don't forget to pass the Infura api key:
```ts
import { ETH_CONFIG1, TokenService } from "@humandataincome/ethersfactory";

const tokenService = new TokenService(ETH_CONFIG1('INFURA_API_KEY'));

```

### Useful Info:

Many operations in Ethereum operate on numbers which are outside the range of safe values to use in JavaScript.

So we decided to use Decimal.js, that is an object which safely allows mathematical operations on numbers of any magnitude.

To make it even easier to use this library, we have extended it by adding some methods. We have called BigDecimal.

Most operations which need to return a value will return a BigDecimal and parameters which accept values will generally accept them.

You can import BigDecimal into your project like this:
```ts
import { BigDecimal } from "@humandataincome/ethersfactory";

const newValue = new BigDecimal(0);
```
We recommend referring to the original decimal.js <a href="https://mikemcl.github.io/decimal.js/" target="_blank">documentation</a>.
