/** Known weak JWT secrets; compared case-insensitively after trim. */
export const INSECURE_JWT_SECRETS: ReadonlySet<string> = new Set([
  'change-me-to-a-long-random-secret',
  'change-me',
  'secret',
  'password',
  'test',
  'development',
]);

export function isInsecureJwtSecret(secret: string): boolean {
  return INSECURE_JWT_SECRETS.has(secret.trim().toLowerCase());
}
