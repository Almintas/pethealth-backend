import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  /** User token version at issue time; tokens without it are treated as version 0. */
  tv?: number;
}
