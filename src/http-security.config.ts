import { HttpStatus, INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ErrorRequestHandler } from 'express';
import helmet from 'helmet';

/** Maximum JSON request body size (GraphQL POST payloads). */
export const JSON_BODY_LIMIT = '1mb';

/** Maximum URL-encoded request body size. */
export const URLENCODED_BODY_LIMIT = '100kb';

/**
 * API-oriented Helmet defaults and explicit body size limits.
 * CSP is disabled because this service is GraphQL/JSON-only (no HTML UI).
 */
export function applyHttpSecurityMiddleware(app: INestApplication): void {
  const expressApp = app as NestExpressApplication;

  expressApp.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  expressApp.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  expressApp.useBodyParser('urlencoded', {
    limit: URLENCODED_BODY_LIMIT,
    extended: true,
  });

  const handlePayloadTooLarge: ErrorRequestHandler = (err, _req, res, next) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      (err as { type: string }).type === 'entity.too.large'
    ) {
      return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'request entity too large',
      });
    }
    next(err);
  };

  expressApp.use(handlePayloadTooLarge);
}
