import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { isInsecureJwtSecret } from './insecure-jwt-secrets';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  /** Comma-separated browser origins allowed to call the API (required in production). */
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  /** Default API rate limit: max requests per TTL window (all routes). */
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT?: number;

  /** Default API rate limit window in milliseconds. */
  @IsInt()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_MS?: number;

  /** Auth (login/register) rate limit: max attempts per TTL window. */
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_AUTH_LIMIT?: number;

  /** Auth rate limit window in milliseconds. */
  @IsInt()
  @Min(1000)
  @IsOptional()
  THROTTLE_AUTH_TTL_MS?: number;
}

function assertJwtSecretPolicy(nodeEnv: Environment, jwtSecret: string): void {
  if (nodeEnv !== Environment.Production) {
    return;
  }

  const trimmed = jwtSecret.trim();

  if (trimmed.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters when NODE_ENV is production',
    );
  }

  if (isInsecureJwtSecret(trimmed)) {
    throw new Error(
      'JWT_SECRET must not use a known insecure value when NODE_ENV is production',
    );
  }
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  assertJwtSecretPolicy(validatedConfig.NODE_ENV, validatedConfig.JWT_SECRET);

  return validatedConfig;
}
