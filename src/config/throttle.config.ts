import { ConfigService } from '@nestjs/config';

const DEFAULT_THROTTLE_LIMIT = 100;
const DEFAULT_THROTTLE_TTL_MS = 60_000;

export function buildDefaultThrottlerOptions(configService: ConfigService): {
  name: string;
  ttl: number;
  limit: number;
}[] {
  return [
    {
      name: 'default',
      ttl:
        configService.get<number>('THROTTLE_TTL_MS') ?? DEFAULT_THROTTLE_TTL_MS,
      limit:
        configService.get<number>('THROTTLE_LIMIT') ?? DEFAULT_THROTTLE_LIMIT,
    },
  ];
}
