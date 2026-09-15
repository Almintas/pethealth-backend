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

@InputType({ description: 'Input for creating a medical record' })
export class CreateMedicalRecordInput {
  @Field(() => ID, { description: 'Pet identifier' })
  @IsMongoId()
  petId!: string;

  @Field(() => GraphQLISODateTime, { description: 'Date of the medical event' })
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @Field(() => String, { description: 'Type of medical record' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  type!: string;

  @Field(() => String, { description: 'Record title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @Field(() => String, { description: 'Detailed description', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  description?: string;

  @Field(() => String, { description: 'Diagnosis summary', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimString)
  diagnosis?: string;

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

  @Field(() => String, { description: 'Additional notes', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  notes?: string;
}
