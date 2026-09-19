import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Input for updating a medication record' })
export class UpdateMedicationInput {
  @Field(() => String, { description: 'Medication name', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  name?: string;

  @Field(() => Number, { description: 'Dosage amount', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dosage?: number;

  @Field(() => String, { description: 'Dosage unit', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimString)
  dosageUnit?: string;

  @Field(() => String, { description: 'Dosing frequency', nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  frequency?: string;

  @Field(() => GraphQLISODateTime, {
    description: 'Treatment start date',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

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
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
