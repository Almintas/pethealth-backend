import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../constants/password-policy';

@InputType({ description: 'Input for registering a new user account' })
export class RegisterInput {
  @Field(() => String, { description: 'Unique email address' })
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @Field(() => String, {
    description: 'Account password (8-72 characters)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  password!: string;

  @Field(() => String, { description: 'Given name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @Field(() => String, { description: 'Family name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;
}
