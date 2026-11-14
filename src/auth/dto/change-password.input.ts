import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  LOGIN_PASSWORD_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../constants/password-policy';

@InputType({ description: 'Change password for the authenticated user' })
export class ChangePasswordInput {
  @Field(() => String, { description: 'Current account password' })
  @IsString()
  @MinLength(1)
  @MaxLength(LOGIN_PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @Field(() => String, { description: 'New password (8-72 characters)' })
  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  newPassword!: string;
}
