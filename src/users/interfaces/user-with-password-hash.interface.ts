import { UserModel } from '../models/user.model';

export interface UserWithPasswordHash {
  user: UserModel;
  passwordHash: string;
}
