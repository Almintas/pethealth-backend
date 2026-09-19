import { registerEnumType } from '@nestjs/graphql';

/** Owner Portal accounts use USER. VET/ADMIN may write clinic-managed health data via GraphQL. */
export enum UserRole {
  USER = 'USER',
  VET = 'VET',
  ADMIN = 'ADMIN',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Role assigned to a user account',
});
