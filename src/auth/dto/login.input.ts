import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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
  password!: string;
}
