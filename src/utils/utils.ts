import * as crypto from 'crypto';
import { BigDecimal } from './bigdecimal';

export function randomBigDecimal(min: BigDecimal, max: BigDecimal): BigDecimal {
  return new BigDecimal(Math.random()).mul(max.sub(min)).add(min);
}

export function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function chunkify<T>(items: T[], size: number): T[][] {
  if (items.length < size)
    return [items];
  const chunks = [];
  while (items.length)
    chunks.push(items.splice(0, size));
  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomString(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length);
}

export function chunkifyBigDecimal(total: BigDecimal, min: BigDecimal, max: BigDecimal): BigDecimal[] {
  const chunks = [];
  while (!total.eq(0)) {
    const chunk = BigDecimal.min(randomBigDecimal(min, max), total); // Dirty trick to fill the total
    total = total.sub(chunk);
    chunks.push(chunk);
  }
  return chunks;
}
