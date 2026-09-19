import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthResolver } from './health.resolver';

describe('HealthResolver', () => {
  let resolver: HealthResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthResolver,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): string | undefined =>
              key === 'NODE_ENV' ? 'test' : undefined,
          },
        },
      ],
    }).compile();

    resolver = module.get<HealthResolver>(HealthResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('reports an "ok" status', () => {
    expect(resolver.health().status).toBe('ok');
  });

  it('reflects the active environment from config', () => {
    expect(resolver.health().environment).toBe('test');
  });

  it('returns a valid ISO-8601 timestamp', () => {
    const { timestamp } = resolver.health();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
