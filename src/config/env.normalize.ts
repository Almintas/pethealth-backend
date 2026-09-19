/**
 * Maps common hosting-provider variable names onto the keys this API validates.
 * Platform env vars are merged with any .env file values before validation runs.
 */
export function normalizeDeploymentEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  // Nest passes env-file + process.env into `config`; overlay ensures explicit keys win (tests, .env).
  const merged: Record<string, unknown> = {
    ...process.env,
    ...config,
  };

  const pickNonEmptyString = (key: string): string | undefined => {
    const value = merged[key];
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  if (!pickNonEmptyString('MONGODB_URI')) {
    const mongoUri =
      pickNonEmptyString('DATABASE_URL') ??
      pickNonEmptyString('MONGO_URL') ??
      pickNonEmptyString('MONGODB_URL') ??
      pickNonEmptyString('MONGO_PUBLIC_URL');

    if (mongoUri) {
      merged.MONGODB_URI = mongoUri;
    }
  }

  if (!pickNonEmptyString('JWT_SECRET')) {
    const jwtSecret =
      pickNonEmptyString('JWT_SECRET_KEY') ??
      pickNonEmptyString('AUTH_JWT_SECRET') ??
      pickNonEmptyString('APP_JWT_SECRET');

    if (jwtSecret) {
      merged.JWT_SECRET = jwtSecret;
    }
  }

  return merged;
}
