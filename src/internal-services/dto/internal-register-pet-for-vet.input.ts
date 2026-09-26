import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InternalPetOwnerInput } from './internal-pet-owner.input';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({
  description: 'Register a canonical Pet for an Owner via Vet integration',
})
export class InternalRegisterPetForVetInput {
  @Field(() => InternalPetOwnerInput)
  @ValidateNested()
  @Type(() => InternalPetOwnerInput)
  owner!: InternalPetOwnerInput;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  name!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  species!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimString)
  breed?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimString)
  gender?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;
}
