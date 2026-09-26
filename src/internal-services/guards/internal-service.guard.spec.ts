import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  INTERNAL_SERVICE_SECRET_HEADER,
  InternalServiceGuard,
} from './internal-service.guard';

describe('InternalServiceGuard', () => {
  const configService = {
    get: jest.fn(),
  };

  const guard = new InternalServiceGuard(
    configService as unknown as ConfigService,
  );

  const buildContext = (headers: Record<string, string>) => {
    const request = { headers };
    const gqlContext = {
      getContext: () => ({ req: request }),
    };
    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlContext as unknown as GqlExecutionContext);
    return {} as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('test-service-secret-value-32chars');
  });

  it('rejects requests without the service secret header', () => {
    expect(() => guard.canActivate(buildContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows requests with a matching service secret', () => {
    expect(() =>
      guard.canActivate(
        buildContext({
          [INTERNAL_SERVICE_SECRET_HEADER]: 'test-service-secret-value-32chars',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects requests with an invalid service secret', () => {
    expect(() =>
      guard.canActivate(
        buildContext({
          [INTERNAL_SERVICE_SECRET_HEADER]: 'wrong-secret',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
