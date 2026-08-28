/** Decimal(10,2) 用分计算，避免 JS 浮点把 19.90 * qty 算歪。 */
export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function decimalStringFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
