import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './config/cors.config';
import { Environment } from './config/env.validation';
import { applyHttpSecurityMiddleware } from './http-security.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  applyHttpSecurityMiddleware(app);

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
