import { Environment } from './env.validation';

const DEFAULT_DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
] as const;

export function resolveCorsOrigins(
  corsOrigin: string | undefined,
  nodeEnv: Environment,
): string[] {
  const trimmed = corsOrigin?.trim();
  if (trimmed) {
    return trimmed
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  if (nodeEnv === Environment.Production) {
    throw new Error('CORS_ORIGIN is required when NODE_ENV is production');
  }

  return [...DEFAULT_DEVELOPMENT_ORIGINS];
}
