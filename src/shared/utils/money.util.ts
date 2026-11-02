/** Round a finite currency amount to cents, compensating for binary float noise. */
export function roundCurrencyAmount(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
