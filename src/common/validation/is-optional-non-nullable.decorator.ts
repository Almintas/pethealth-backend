import { ValidateIf, ValidationOptions } from 'class-validator';

/**
 * Like `@IsOptional()`, but only skips validation when the value is `undefined`.
 *
 * GraphQL update inputs are nullable, so clients can send `null` explicitly.
 * For fields that are required in the database, `null` must fail validation
 * (400) instead of reaching Mongoose and surfacing as a 500.
 */
export function IsOptionalNonNullable(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateIf(
    (_object: object, value: unknown) => value !== undefined,
    validationOptions,
  );
}
