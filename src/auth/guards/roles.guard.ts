import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserModel } from '../../users/models/user.model';
import { UserRole } from '../../users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

export const VETERINARY_HEALTH_WRITE_FORBIDDEN_MESSAGE =
  'Your account cannot modify veterinary health records. Updates are managed by your veterinary clinic.';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const user = this.resolveUser(context);
    if (!user) {
      throw new ForbiddenException();
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(VETERINARY_HEALTH_WRITE_FORBIDDEN_MESSAGE);
    }

    return true;
  }

  private resolveUser(context: ExecutionContext): UserModel | undefined {
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext<{ req: { user?: UserModel } }>().req.user;
    }

    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest<{ user?: UserModel }>().user;
    }

    return undefined;
  }
}
