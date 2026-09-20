import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType({ description: 'Change password for the authenticated user' })
export class ChangePasswordInput {
  @Field(() => String, { description: 'Current account password' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @Field(() => String, { description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
