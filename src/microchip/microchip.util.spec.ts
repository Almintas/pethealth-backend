import { microchipPattern, normalizeMicrochip } from './microchip.util';

describe('microchip numbers', () => {
  it('normalizes the usual ways of typing a chip number', () => {
    expect(normalizeMicrochip('440 123 456 789 012')).toBe('440123456789012');
    expect(normalizeMicrochip('440-123-456.789/012')).toBe('440123456789012');
    expect(normalizeMicrochip('a1b2c3d4e5')).toBe('A1B2C3D4E5');
  });

  it('rejects values that cannot be chip numbers', () => {
    expect(normalizeMicrochip('1234')).toBeNull();
    expect(normalizeMicrochip('4401234567890123')).toBeNull();
    expect(normalizeMicrochip('440123456$89012')).toBeNull();
    expect(normalizeMicrochip('')).toBeNull();
  });

  it('matches stored numbers with or without separators', () => {
    const pattern = microchipPattern('440123456789012');
    expect(pattern.test('440123456789012')).toBe(true);
    expect(pattern.test(' 440 123 456 789 012 ')).toBe(true);
    expect(pattern.test('440-123-456-789-012')).toBe(true);
    expect(pattern.test('4401234567890123')).toBe(false);
    expect(pattern.test('x440123456789012')).toBe(false);
    expect(microchipPattern('A1B2C3D4E5').test('a1 b2 c3 d4 e5')).toBe(true);
  });
});
