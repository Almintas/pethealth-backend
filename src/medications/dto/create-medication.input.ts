import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Input for creating a medication record' })
export class CreateMedicationInput {
  @Field(() => ID, { description: 'Pet identifier' })
  @IsMongoId()
  petId!: string;

  @Field(() => String, { description: 'Medication name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  name!: string;

  @Field(() => Number, { description: 'Dosage amount' })
  @IsNumber()
  @Min(0)
  dosage!: number;

  @Field(() => String, { description: 'Dosage unit' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimString)
  dosageUnit!: string;

  @Field(() => String, { description: 'Dosing frequency' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  frequency!: string;

  @Field(() => GraphQLISODateTime, { description: 'Treatment start date' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Field(() => GraphQLISODateTime, {
    description: 'Treatment end date',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

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

  @Field(() => Boolean, {
    description: 'Whether the medication is active',
    nullable: true,
    defaultValue: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
