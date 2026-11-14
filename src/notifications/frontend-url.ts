import { ConfigService } from '@nestjs/config';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

/** Builds an absolute Owner Portal URL for links in emails. */
export function buildFrontendUrl(
  configService: ConfigService,
  path: string,
): string {
  const base =
    configService.get<string>('FRONTEND_URL')?.trim() || DEFAULT_FRONTEND_URL;
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
