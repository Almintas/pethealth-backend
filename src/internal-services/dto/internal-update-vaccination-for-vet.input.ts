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
export class InternalUpdateVaccinationForVetInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  vaccineName?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  administeredAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextDueAt?: Date;

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
  @MaxLength(100)
  @Transform(trimString)
  batchNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  notes?: string;
}
