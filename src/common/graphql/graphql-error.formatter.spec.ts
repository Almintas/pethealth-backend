import { GraphQLFormattedError } from 'graphql';
import { formatGraphqlError } from './graphql-error.formatter';

describe('formatGraphqlError', () => {
  it('preserves client errors in production', () => {
    const error: GraphQLFormattedError = {
      message: 'Invalid credentials',
      extensions: {
        code: 'UNAUTHORIZED',
        originalError: { statusCode: 401 },
      },
    };

    expect(formatGraphqlError(error, 'production').message).toBe(
      'Invalid credentials',
    );
  });

  it('sanitizes internal errors in production', () => {
    const error: GraphQLFormattedError = {
      message: 'Unexpected failure',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        originalError: { statusCode: 500 },
      },
    };

    expect(formatGraphqlError(error, 'production')).toEqual({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
      path: undefined,
    });
  });
});
