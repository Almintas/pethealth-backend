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

@InputType()
export class InternalCreateMedicalRecordForVetInput {
  @Field(() => ID)
  @IsMongoId()
  petId!: string;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(trimString)
  type!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

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
