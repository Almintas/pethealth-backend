import { Environment } from './env.validation';

export type TrustProxySetting = boolean | number | string;

/**
 * Resolves Express' `trust proxy` setting.
 *
 * Rate limiting keys on the client IP. Behind a PaaS load balancer (Render,
 * Railway, Fly, Heroku, ...) every request otherwise appears to come from the
 * proxy, so all users would share a single rate-limit bucket.
 *
 * - `TRUST_PROXY` unset: trust one hop in production, nothing elsewhere.
 * - `true` / `false`: trust all / no proxies.
 * - integer: number of proxy hops to trust.
 * - anything else: passed through (e.g. `loopback, 10.0.0.0/8`).
 */
export function resolveTrustProxy(
  rawValue: string | undefined,
  nodeEnv: Environment,
): TrustProxySetting {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return nodeEnv === Environment.Production ? 1 : false;
  }
  const lower = trimmed.toLowerCase();
  if (lower === 'true') {
    return true;
  }
  if (lower === 'false') {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}
