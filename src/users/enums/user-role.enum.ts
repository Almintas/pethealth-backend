import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  USER = 'USER',
  VET = 'VET',
  ADMIN = 'ADMIN',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Role assigned to a user account',
});
