import { GraphQLFormattedError } from 'graphql';
import { isProductionEnvironment } from '../../config/environment.util';

const GENERIC_INTERNAL_MESSAGE = 'Internal server error';

const CLIENT_ERROR_CODES = new Set([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'GRAPHQL_VALIDATION_FAILED',
  'BAD_USER_INPUT',
]);

function resolveHttpStatus(
  formattedError: GraphQLFormattedError,
): number | undefined {
  if (typeof formattedError.extensions?.status === 'number') {
    return formattedError.extensions.status;
  }

  const original = formattedError.extensions?.originalError;
  if (original && typeof original === 'object' && 'statusCode' in original) {
    const statusCode = (original as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number') {
      return statusCode;
    }
  }

  return undefined;
}

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
  nodeEnv: string | undefined,
): GraphQLFormattedError {
  if (!isProductionEnvironment(nodeEnv)) {
    return formattedError;
  }

  const httpStatus = resolveHttpStatus(formattedError);
  if (httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500) {
    return formattedError;
  }

  const code = formattedError.extensions?.code;
  const codeString =
    typeof code === 'string' || typeof code === 'number'
      ? String(code)
      : undefined;
  if (codeString !== undefined && CLIENT_ERROR_CODES.has(codeString)) {
    return formattedError;
  }

  return {
    message: GENERIC_INTERNAL_MESSAGE,
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
    },
    path: formattedError.path,
  };
}
