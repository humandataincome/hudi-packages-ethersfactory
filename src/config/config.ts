import { Config } from './interfaces';

export const BSC_CONFIG: Config = {
  logLevel: 'info',
  addresses: {
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      WETH: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      HUDI: '0x83d8Ea5A4650B68Cd2b57846783d86DF940F7458',
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      WBNBHUDI: '0x9428d7F0660B1Ec8E42930c08443880F8F663875',
    },
    proxyUtils: '0xFC308b8346198ba98b166282BbE01eCEF94E50e6',
    dexRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    miniLiquidityProvider: '0xe62B82b85E898FF1b8B2A960C234B17F8DB4C0dF',
    pancakeSwapLocker: '',
    prediction: '0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA',
    staking: '0x8f82FDFBE3fa9746a6854d7dbD7dFAAd49FA1E91',
    stakingLPToken: '0x60fC0BF9B2d46396b82aeB996a32B1520b200AF1',
    vesting: '',
    treasury: '0x4fD3CcbC8021c78e98a837BaEf4CA8669D6030EC',
  },
  jsonRpcUrl: 'https://bsc-dataseed.binance.org',
  explorerUrl: 'https://bscscan.com',
  dexSubgraphUrl:
    'https://proxy-worker-api.pancakeswap.com/bsc-exchange',
};

export const ETH_CONFIG1 = (jsonRpcApiKey?: string): Config => {
  return {
    logLevel: 'info',
    addresses: {
      tokens: {
        ETH: '0x0000000000000000000000000000000000000000',
        WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        WBNB: '',
        HUDI: '',
        BUSD: '',
        WBNBHUDI: '',
      },
      proxyUtils: '',
      dexRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      miniLiquidityProvider: '',
      pancakeSwapLocker: '',
      prediction: '',
      staking: '',
      stakingLPToken: '',
      vesting: '',
      treasury: '',
    },
    jsonRpcUrl: `https://mainnet.infura.io/v3/${jsonRpcApiKey}`,
    explorerUrl: 'https://etherscan.io/',
    dexSubgraphUrl:
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
  };
};

export const BSCTEST_CONFIG: Config = {
  logLevel: 'debug',
  addresses: {
    tokens: {
      ETH: '0x0000000000000000000000000000000000000000',
      WETH: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      WBNB: '0x094616f0bdfb0b526bd735bf66eca0ad254ca81f',
      HUDI: '0x220fc122CcB27cA8B742a6520237612C1d7D01aB',
      USDT: '0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684',
      BUSD: '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee',
      WBNBHUDI: '0x6de320CbC328202B7eC2aBFf6127B16702C702fa',
    },
    proxyUtils: '0x7ba8b8286359e10C4537A76006bEbf0B8Ae0a6A6',

    dexRouter: '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3', // panacakeswap router pancake.kiemtienonline360
    // dexRouter: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',  // official panacakeswap router bsc testnet
    miniLiquidityProvider: '0xbe972944adf82787872baf9Cf22004d7B50B318D',
    pancakeSwapLocker: '0xDea76607d9ba4FdFA04eeE51f4360fEE2B38ed0a',
    prediction: '',
    staking: '0x8553eaF59DAe095a417e45C1feb5A1Cc37C0f6e8',
    stakingLPToken: '0x8d2e7605D60184D34eaF2AA978371318952ca9bd',
    vesting: '0xA4B55EDaCB6C1267d2114056821f924868bbcD8A',
    treasury: '0x600EcD8B1a0efC813ACbBC53d075bBfe59265dBd',
  },
  jsonRpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  explorerUrl: 'https://testnet.bscscan.com',
  dexSubgraphUrl:
    'https://proxy-worker-api.pancakeswap.com/bsc-exchange',
};
