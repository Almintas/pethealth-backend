import { normalizeDeploymentEnv } from './env.normalize';

describe('normalizeDeploymentEnv', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers explicit MONGODB_URI over DATABASE_URL', () => {
    const result = normalizeDeploymentEnv({
      MONGODB_URI: 'mongodb://primary',
      DATABASE_URL: 'mongodb://fallback',
    });

    expect(result.MONGODB_URI).toBe('mongodb://primary');
  });

  it('maps DATABASE_URL when MONGODB_URI is missing', () => {
    const result = normalizeDeploymentEnv({
      DATABASE_URL: 'mongodb://from-provider',
    });

    expect(result.MONGODB_URI).toBe('mongodb://from-provider');
  });
});
