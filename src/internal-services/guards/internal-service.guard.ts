import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { timingSafeEqual } from 'node:crypto';
export const INTERNAL_SERVICE_SECRET_HEADER = 'x-pethealth-service-secret';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.configService
      .get<string>('OWNER_SERVICE_SECRET')
      ?.trim();
    if (!expectedSecret) {
      throw new UnauthorizedException(
        'Internal service access is not configured',
      );
    }

    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext<{
      req: { headers: Record<string, string | string[] | undefined> };
    }>().req;
    const provided = this.readHeaderSecret(request.headers);
    if (!provided || !this.secretsEqual(provided, expectedSecret)) {
      throw new UnauthorizedException('Invalid internal service credentials');
    }

    return true;
  }

  private readHeaderSecret(
    headers: Record<string, string | string[] | undefined>,
  ): string | null {
    const raw = headers[INTERNAL_SERVICE_SECRET_HEADER];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    if (Array.isArray(raw) && raw[0]?.trim()) {
      return raw[0].trim();
    }
    return null;
  }

  private secretsEqual(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
