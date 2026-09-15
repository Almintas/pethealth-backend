import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './config/cors.config';
import { Environment } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  const nodeEnv =
    configService.get<Environment>('NODE_ENV') ?? Environment.Development;
  const corsOrigins = resolveCorsOrigins(
    configService.get<string>('CORS_ORIGIN'),
    nodeEnv,
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
  logger.log(`Application listening on port ${port} (${nodeEnv})`);
}

void bootstrap();
