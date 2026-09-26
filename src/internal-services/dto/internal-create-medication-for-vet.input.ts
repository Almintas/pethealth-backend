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

@InputType()
export class InternalCreateMedicationForVetInput {
  @Field(() => ID)
  @IsMongoId()
  petId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  name!: string;

  @Field()
  @IsNumber()
  @Min(0)
  dosage!: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimString)
  dosageUnit!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  frequency!: string;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  veterinarianName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  clinicName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  notes?: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
