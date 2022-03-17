import Decimal from 'decimal.js';
import { BigNumber } from 'ethers';

export { Decimal as BigDecimal } from 'decimal.js';
declare module 'decimal.js' {
  interface Decimal {
    toBigNumber(decimals?: number): BigNumber;

    toBigInt(decimals?: number): bigint;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Decimal {
    let fromBigNumber: (n: BigNumber, decimals?: number) => Decimal;
    let fromBigInt: (n: bigint, decimals?: number) => Decimal;
    let fromString: (n: string, decimals?: number) => Decimal;
  }
}

Decimal.set({ precision: 78 }); // 2^256 has length 78

Decimal.prototype.toBigNumber = function(decimals = 0): BigNumber {
  return BigNumber.from(this.mul('1e' + decimals).toFixed(0));
};

Decimal.prototype.toBigInt = function(decimals = 0): bigint {
  return BigInt(this.mul('1e' + decimals).toFixed(0));
};

Decimal.fromBigNumber = function(n: BigNumber, decimals = 0): Decimal {
  return new Decimal(n.toString()).mul('1e-' + decimals);
};

Decimal.fromBigInt = function(n: bigint, decimals = 0): Decimal {
  return new Decimal(n.toString()).mul('1e-' + decimals);
};

Decimal.fromString = function(n: string, decimals = 18): Decimal {
  return new Decimal(n).mul('1e-' + decimals);
};
