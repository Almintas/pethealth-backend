import { Throttle } from '@nestjs/throttler';

const authLimit = Number(process.env.THROTTLE_AUTH_LIMIT ?? 5);
const authTtlMs = Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60_000);

/** Stricter rate limit for login and register mutations. */
export const AuthRateLimit = (): MethodDecorator & ClassDecorator =>
  Throttle({
    default: {
      limit: Number.isFinite(authLimit) && authLimit > 0 ? authLimit : 5,
      ttl: Number.isFinite(authTtlMs) && authTtlMs >= 1000 ? authTtlMs : 60_000,
    },
  });
