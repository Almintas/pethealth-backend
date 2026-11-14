import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

@InputType({ description: 'Request a password reset / account setup email' })
export class RequestPasswordResetInput {
  @Field(() => String, { description: 'Account email address' })
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
