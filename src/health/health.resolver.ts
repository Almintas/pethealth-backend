import { ConfigService } from '@nestjs/config';
import { Query, Resolver } from '@nestjs/graphql';
import { HealthStatus } from './models/health-status.model';

@Resolver(() => HealthStatus)
export class HealthResolver {
  constructor(private readonly configService: ConfigService) {}

  @Query(() => HealthStatus, {
    name: 'health',
    description: 'Returns the current service health status.',
  })
  health(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV') ?? 'development',
    };
  }
}
