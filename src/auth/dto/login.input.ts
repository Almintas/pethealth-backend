import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LOGIN_PASSWORD_MAX_LENGTH } from '../constants/password-policy';

@InputType({ description: 'Input for authenticating a user' })
export class LoginInput {
  @Field(() => String, { description: 'Account email address' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @Field(() => String, { description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LOGIN_PASSWORD_MAX_LENGTH)
  password!: string;
}
