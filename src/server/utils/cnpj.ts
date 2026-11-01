/** Validates the Brazilian CNPJ check digits (Módulo 11). */
export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits.charAt(i), 10) * weights1[i]!;
  }
  const mod1 = sum1 % 11;
  const checkDigit1 = mod1 < 2 ? 0 : 11 - mod1;
  if (parseInt(digits.charAt(12), 10) !== checkDigit1) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits.charAt(i), 10) * weights2[i]!;
  }
  const mod2 = sum2 % 11;
  const checkDigit2 = mod2 < 2 ? 0 : 11 - mod2;
  return parseInt(digits.charAt(13), 10) === checkDigit2;
}
