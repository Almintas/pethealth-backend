import 'reflect-metadata';
import { Environment, validate } from './env.validation';

describe('env validation', () => {
  const baseConfig = {
    MONGODB_URI: 'mongodb://localhost:27017/pethealth',
    JWT_SECRET: 'change-me-to-a-long-random-secret',
  };

  it('accepts short default JWT secret in development', () => {
    expect(() =>
      validate({
        ...baseConfig,
        NODE_ENV: Environment.Development,
      }),
    ).not.toThrow();
  });

  it('accepts short JWT secret in test', () => {
    expect(() =>
      validate({
        ...baseConfig,
        NODE_ENV: Environment.Test,
      }),
    ).not.toThrow();
  });

  it('rejects JWT secrets shorter than 32 characters in production', () => {
    expect(() =>
      validate({
        ...baseConfig,
        NODE_ENV: Environment.Production,
        CORS_ORIGIN: 'https://app.example.com',
        JWT_SECRET: 'a'.repeat(20),
      }),
    ).toThrow(/at least 32 characters/);
  });

  it('rejects known insecure JWT secrets in production', () => {
    expect(() =>
      validate({
        ...baseConfig,
        NODE_ENV: Environment.Production,
        CORS_ORIGIN: 'https://app.example.com',
        JWT_SECRET: 'change-me-to-a-long-random-secret',
      }),
    ).toThrow(/insecure value/);
  });

  it('accepts a strong JWT secret in production', () => {
    const result = validate({
      ...baseConfig,
      NODE_ENV: Environment.Production,
      CORS_ORIGIN: 'https://app.example.com',
      JWT_SECRET: 'a'.repeat(32),
    });

    expect(result.NODE_ENV).toBe(Environment.Production);
  });
});
