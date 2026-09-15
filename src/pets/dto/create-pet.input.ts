import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Input for creating a pet' })
export class CreatePetInput {
  @Field(() => String, { description: 'Pet name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  name!: string;

  @Field(() => String, { description: 'Pet species' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  species!: string;

  @Field(() => String, { description: 'Pet breed', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimString)
  breed?: string;

  @Field(() => String, { description: 'Pet gender', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimString)
  gender?: string;

  @Field(() => GraphQLISODateTime, {
    description: 'Date of birth',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @Field(() => String, {
    description: 'Microchip identifier',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimString)
  microchipNumber?: string;
}
