/** Exact rational arithmetic. JSON uses decimal integer strings; no float state. */
export type Exact = Readonly<{ numerator: string; denominator: string }>;
export type Decimal = string;
function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function ratio(n: bigint, d: bigint): Exact {
  if (d <= 0n) throw new Error('Denominator must be positive');
  const g = gcd(n, d);
  return Object.freeze({ numerator: String(n / g), denominator: String(d / g) });
}
export function exact(value: Decimal): Exact {
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,8})?$/.test(value) || value.length > 30)
    throw new Error('Expected a finite decimal string (maximum 8 decimal places)');
  const [whole, part = ''] = value.split('.');
  const denominator = 10n ** BigInt(part.length);
  return ratio(BigInt(whole) * denominator + (value.startsWith('-') ? -1n : 1n) * BigInt(part || '0'), denominator);
}
export function validateExact(a: Exact): void {
  if (!a || !/^-?\d{1,200}$/.test(a.numerator) || !/^\d{1,200}$/.test(a.denominator) || BigInt(a.denominator) <= 0n)
    throw new Error('Invalid exact value');
}
export function add(a: Exact, b: Exact): Exact {
  validateExact(a); validateExact(b);
  return ratio(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}
export function multiply(a: Exact, b: Exact): Exact {
  validateExact(a); validateExact(b);
  return ratio(BigInt(a.numerator) * BigInt(b.numerator), BigInt(a.denominator) * BigInt(b.denominator));
}
export function divide(a: Exact, b: Exact): Exact {
  validateExact(a); validateExact(b);
  if (BigInt(b.numerator) <= 0n) throw new Error('Divisor must be positive');
  return ratio(BigInt(a.numerator) * BigInt(b.denominator), BigInt(a.denominator) * BigInt(b.numerator));
}
export function compare(a: Exact, b: Exact): number {
  validateExact(a); validateExact(b);
  const delta = BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator);
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
export const sum = (values: readonly Exact[]): Exact => values.reduce(add, exact('0'));
export function mean(values: readonly Exact[]): Exact {
  if (!values.length) throw new Error('Cannot average an empty group');
  return divide(sum(values), exact(String(values.length)));
}
export function bounded(value: Exact, low: string, high: string): Exact {
  if (compare(value, exact(low)) < 0 || compare(value, exact(high)) > 0) throw new Error(`Value outside ${low}..${high}`);
  return value;
}
/** Nonnegative nearest integer, ties upwards. Display or threshold boundaries only. */
export function rounded(value: Exact): string {
  bounded(value, '0', '99999999999999999999');
  const n = BigInt(value.numerator), d = BigInt(value.denominator);
  return String((2n * n + d) / (2n * d));
}
export const displayKm = (km: Exact): string => rounded(km);
