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
import { normalizeDeploymentEnv } from './env.normalize';

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

function formatValidationFailure(
  config: Record<string, unknown>,
  errors: ReturnType<typeof validateSync>,
): string {
  const requiredKeys = ['MONGODB_URI', 'JWT_SECRET'] as const;
  const missing = requiredKeys.filter(
    (key) => !pickNonEmptyString(config, key),
  );

  const hints: string[] = [];
  if (missing.includes('MONGODB_URI')) {
    hints.push(
      'Set MONGODB_URI (or DATABASE_URL / MONGO_URL from your MongoDB add-on).',
    );
  }
  if (missing.includes('JWT_SECRET')) {
    hints.push(
      'Set JWT_SECRET to a long random string (32+ characters in production).',
    );
  }

  const hintBlock = hints.length > 0 ? ` Deployment: ${hints.join(' ')}` : '';

  return `Environment configuration is invalid.${hintBlock} Details: ${errors.toString()}`;
}

function pickNonEmptyString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const normalized = normalizeDeploymentEnv(config);

  const validatedConfig = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(formatValidationFailure(normalized, errors));
  }

  assertJwtSecretPolicy(validatedConfig.NODE_ENV, validatedConfig.JWT_SECRET);

  return validatedConfig;
}
