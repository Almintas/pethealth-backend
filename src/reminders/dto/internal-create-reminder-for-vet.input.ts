import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ReminderType } from '../enums/reminder-type.enum';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'A reminder a clinic sets for the pet owner' })
export class InternalCreateReminderForVetInput {
  @Field(() => ID)
  @IsMongoId()
  petId!: string;

  @Field(() => ReminderType)
  @IsEnum(ReminderType)
  type!: ReminderType;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  message?: string;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @Field(() => ID, { description: 'Vet backend clinic id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  clinicId!: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clinicName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdByName?: string;
}
