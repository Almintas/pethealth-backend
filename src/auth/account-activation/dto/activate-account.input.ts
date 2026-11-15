import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

@InputType({ description: 'Set a password on a clinic-created account' })
export class ActivateAccountInput {
  @Field(() => String, { description: 'Token from the activation email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

  @Field(() => String, {
    description: 'New account password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
