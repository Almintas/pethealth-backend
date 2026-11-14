import { UserModel } from '../models/user.model';

export interface UserWithPasswordHash {
  user: UserModel;
  passwordHash: string;
  tokenVersion: number;
}

export interface UserAuthState {
  user: UserModel;
  tokenVersion: number;
}
