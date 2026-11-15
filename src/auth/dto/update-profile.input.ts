import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsOptionalNonNullable } from '../../common/validation/is-optional-non-nullable.decorator';

@InputType({ description: 'Update the authenticated user profile' })
export class UpdateProfileInput {
  @Field(() => String, {
    nullable: true,
    description: 'Given name',
  })
  @IsOptionalNonNullable()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  firstName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Family name',
  })
  @IsOptionalNonNullable()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  lastName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Unique email address',
  })
  @IsOptionalNonNullable()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;
}
