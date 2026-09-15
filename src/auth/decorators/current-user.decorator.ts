import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserModel } from '../../users/models/user.model';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserModel => {
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext<{ req: { user: UserModel } }>().req.user;
  },
);
