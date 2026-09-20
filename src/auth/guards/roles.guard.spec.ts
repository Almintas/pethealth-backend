import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserModel } from '../../users/models/user.model';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { VETERINARY_HEALTH_WRITE_ROLES } from '../constants/veterinary-health-write.roles';
import {
  RolesGuard,
  VETERINARY_HEALTH_WRITE_FORBIDDEN_MESSAGE,
} from './roles.guard';

function buildUser(role: UserRole): UserModel {
  return {
    id: '507f1f77bcf86cd799439011',
    email: 'owner@example.com',
    firstName: 'Owner',
    lastName: 'User',
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    notificationPreferences: {
      emailAppointmentReminders: true,
      emailMedicationReminders: true,
      emailVaccinationReminders: true,
    },
  };
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  function createGqlContext(user?: UserModel): ExecutionContext {
    const req = { user };
    const gqlCtx = {
      getContext: () => ({ req }),
      getType: () => 'graphql',
    };

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlCtx as unknown as GqlExecutionContext);

    return {
      getType: () => 'graphql',
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows access when no roles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createGqlContext(buildUser(UserRole.USER));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows veterinary health writes for VET role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) =>
        key === ROLES_KEY ? [...VETERINARY_HEALTH_WRITE_ROLES] : undefined,
      );

    const context = createGqlContext(buildUser(UserRole.VET));

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects veterinary health writes for owner USER role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) =>
        key === ROLES_KEY ? [...VETERINARY_HEALTH_WRITE_ROLES] : undefined,
      );

    const context = createGqlContext(buildUser(UserRole.USER));

    try {
      guard.canActivate(context);
      fail('expected ForbiddenException');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).message).toBe(
        VETERINARY_HEALTH_WRITE_FORBIDDEN_MESSAGE,
      );
    }
  });
});
