/** Characters people put between microchip digits ("440 123 456-789"). */
const SEPARATORS = '[\\s.\\-_/]*';

/**
 * Canonical form of a microchip number: separators removed, upper case.
 * ISO 11784/11785 chips have 15 digits; older ones 9–10 alphanumerics.
 * Returns null for anything that cannot be a chip number.
 */
export function normalizeMicrochip(value: string): string | null {
  const normalized = value.replace(/[\s.\-_/]+/g, '').toUpperCase();
  return /^[0-9A-Z]{9,15}$/.test(normalized) ? normalized : null;
}

/**
 * Matches a stored microchip number however it was typed, so existing pets
 * are found without a data migration.
 */
export function microchipPattern(normalized: string): RegExp {
  return new RegExp(
    `^${SEPARATORS}${normalized.split('').join(SEPARATORS)}${SEPARATORS}$`,
    'i',
  );
}
