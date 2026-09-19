import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Input for creating a vaccination record' })
export class CreateVaccinationInput {
  @Field(() => ID, { description: 'Pet identifier' })
  @IsMongoId()
  petId!: string;

  @Field(() => String, { description: 'Name of the vaccine' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  vaccineName!: string;

  @Field(() => GraphQLISODateTime, {
    description: 'When the vaccine was administered',
  })
  @Type(() => Date)
  @IsDate()
  administeredAt!: Date;

  @Field(() => GraphQLISODateTime, {
    description: 'When the next dose is due',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextDueAt?: Date;

  @Field(() => String, { description: 'Veterinarian name', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  veterinarianName?: string;

  @Field(() => String, { description: 'Clinic name', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  clinicName?: string;

  @Field(() => String, { description: 'Vaccine batch number', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimString)
  batchNumber?: string;

  @Field(() => String, { description: 'Additional notes', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  notes?: string;
}
