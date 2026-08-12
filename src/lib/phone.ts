/** Normalize and validate Senegal mobile numbers. */

/** Local mobile: 70/75/76/77/78 + 7 digits (9 digits total). */
const SENEGAL_MOBILE = /^(?:\+?221|00221)?(7[0-8]\d{7})$/;

export function normalizeSenegalPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, "");
  const match = cleaned.match(SENEGAL_MOBILE);
  if (!match) return null;
  return `+221${match[1]}`;
}

export function isValidSenegalPhone(raw: string): boolean {
  return normalizeSenegalPhone(raw) !== null;
}

export const PHONE_ERROR =
  "Numéro invalide. Ex. 77 123 45 67 ou +221 77 123 45 67";
