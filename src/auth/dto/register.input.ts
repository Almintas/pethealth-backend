import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType({ description: 'Input for registering a new user account' })
export class RegisterInput {
  @Field(() => String, { description: 'Unique email address' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @Field(() => String, { description: 'Account password (min 8 characters)' })
  @IsString()
  @MinLength(8)
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
