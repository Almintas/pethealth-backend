import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext<{ req: Request; res: Response }>();
      return { req: ctx.req, res: ctx.res };
    }

    const http = super.getRequestResponse(context);
    return {
      req: http.req as Request,
      res: http.res as Response,
    };
  }
}
