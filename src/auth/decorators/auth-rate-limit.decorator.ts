import { Throttle } from '@nestjs/throttler';

const DEFAULT_AUTH_LIMIT = 5;
const DEFAULT_AUTH_TTL_MS = 60_000;

/**
 * Read at request time, not import time: decorators are evaluated before
 * ConfigModule has loaded `.env` into process.env.
 */
export function resolveAuthLimit(): number {
  const value = Number(process.env.THROTTLE_AUTH_LIMIT ?? DEFAULT_AUTH_LIMIT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_AUTH_LIMIT;
}

export function resolveAuthTtlMs(): number {
  const value = Number(process.env.THROTTLE_AUTH_TTL_MS ?? DEFAULT_AUTH_TTL_MS);
  return Number.isFinite(value) && value >= 1000 ? value : DEFAULT_AUTH_TTL_MS;
}

/** Stricter rate limit for login, register and password reset mutations. */
export const AuthRateLimit = (): MethodDecorator & ClassDecorator =>
  Throttle({
    default: {
      limit: () => resolveAuthLimit(),
      ttl: () => resolveAuthTtlMs(),
    },
  });
