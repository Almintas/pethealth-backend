import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlContextType } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { isProductionEnvironment } from '../../config/environment.util';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType<GqlContextType>() === 'graphql') {
      this.logServerError(exception, 'GraphQL');
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolveHttpResponse(exception);

    if (Number(status) >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `Unhandled server error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
    });
  }

  private resolveHttpResponse(exception: unknown): {
    status: number;
    message: string | string[];
  } {
    const isProduction = isProductionEnvironment(
      this.configService.get<string>('NODE_ENV'),
    );

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : typeof response === 'object' &&
              response !== null &&
              'message' in response
            ? (response as { message: string | string[] }).message
            : exception.message;

      if (
        isProduction &&
        Number(status) >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
      ) {
        return {
          status,
          message: 'Internal server error',
        };
      }

      return { status, message };
    }

    if (isProduction) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
    };
  }

  private logServerError(exception: unknown, contextLabel: string): void {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (Number(status) < Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
        return;
      }
    }

    this.logger.error(
      `Unhandled server error (${contextLabel})`,
      exception instanceof Error ? exception.stack : undefined,
    );
  }
}
