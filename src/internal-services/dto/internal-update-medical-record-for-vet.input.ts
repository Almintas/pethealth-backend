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

@InputType()
export class InternalUpdateMedicalRecordForVetInput {
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  type?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimString)
  diagnosis?: string;

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
}
