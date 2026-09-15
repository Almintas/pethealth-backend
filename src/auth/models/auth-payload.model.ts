import { Field, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../../users/models/user.model';

@ObjectType({ description: 'Successful authentication response' })
export class AuthPayload {
  @Field(() => String, { description: 'JWT access token' })
  accessToken!: string;

  @Field(() => UserModel, { description: 'Authenticated user profile' })
  user!: UserModel;
}
