import { Field, GraphQLISODateTime, InputType, Int } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType()
export class InternalMedicalRecordsPageInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trimString)
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimString)
  type?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}
