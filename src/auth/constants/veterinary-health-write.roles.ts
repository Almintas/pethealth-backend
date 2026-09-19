import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Roles allowed to create/update/delete veterinary health records via GraphQL.
 * Owner accounts ({@link UserRole.USER}) may only read this data in the Owner Portal.
 */
export const VETERINARY_HEALTH_WRITE_ROLES: readonly UserRole[] = [
  UserRole.VET,
  UserRole.ADMIN,
];
