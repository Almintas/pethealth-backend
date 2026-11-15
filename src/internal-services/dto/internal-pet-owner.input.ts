import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Owner identity for Vet-registered pets' })
export class InternalPetOwnerInput {
  @Field()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  firstName!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  lastName!: string;
}
