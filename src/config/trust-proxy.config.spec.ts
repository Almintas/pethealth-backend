import { Environment } from './env.validation';
import { resolveTrustProxy } from './trust-proxy.config';

describe('resolveTrustProxy', () => {
  it('trusts one hop by default in production', () => {
    expect(resolveTrustProxy(undefined, Environment.Production)).toBe(1);
  });

  it('trusts nothing by default outside production', () => {
    expect(resolveTrustProxy(undefined, Environment.Development)).toBe(false);
    expect(resolveTrustProxy('  ', Environment.Test)).toBe(false);
  });

  it('parses booleans, hop counts, and passthrough values', () => {
    expect(resolveTrustProxy('true', Environment.Development)).toBe(true);
    expect(resolveTrustProxy('FALSE', Environment.Production)).toBe(false);
    expect(resolveTrustProxy('2', Environment.Production)).toBe(2);
    expect(
      resolveTrustProxy('loopback, 10.0.0.0/8', Environment.Production),
    ).toBe('loopback, 10.0.0.0/8');
  });
});
