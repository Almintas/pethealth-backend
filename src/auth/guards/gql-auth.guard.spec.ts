import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { GqlAuthGuard } from './gql-auth.guard';

describe('GqlAuthGuard', () => {
  let guard: GqlAuthGuard;

  beforeEach(() => {
    guard = new GqlAuthGuard();
  });

  it('reads the HTTP request from the GraphQL context', () => {
    const request = {
      headers: {
        authorization: 'Bearer test-token',
      },
    } as Request;

    const executionContext = {} as ExecutionContext;
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: request }),
    } as GqlExecutionContext);

    expect(guard.getRequest(executionContext)).toBe(request);
    expect(guard.getRequest(executionContext).headers.authorization).toBe(
      'Bearer test-token',
    );
  });
});
