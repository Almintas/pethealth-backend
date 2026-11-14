import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../constants/password-policy';

@InputType({ description: 'Set a new password using an emailed token' })
export class ResetPasswordInput {
  @Field(() => String, { description: 'Token from the reset / setup email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;

  @Field(() => String, { description: 'New password (8-72 characters)' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}
