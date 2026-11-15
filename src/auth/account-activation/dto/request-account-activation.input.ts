import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

@InputType({ description: 'Request a new account activation email' })
export class RequestAccountActivationInput {
  @Field(() => String)
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
