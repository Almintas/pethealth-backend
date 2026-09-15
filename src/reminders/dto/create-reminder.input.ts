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
  ValidateIf,
} from 'class-validator';
import { ReminderType } from '../enums/reminder-type.enum';
import { SourceType } from '../enums/source-type.enum';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Input for creating a reminder' })
export class CreateReminderInput {
  @Field(() => ID, { description: 'Pet identifier' })
  @IsMongoId()
  petId!: string;

  @Field(() => ReminderType, { description: 'Reminder category' })
  @IsEnum(ReminderType)
  type!: ReminderType;

  @Field(() => String, { description: 'Reminder title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  title!: string;

  @Field(() => String, { description: 'Reminder message', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  message?: string;

  @Field(() => GraphQLISODateTime, { description: 'When the reminder is due' })
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @Field(() => SourceType, {
    description: 'Linked record type',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @Field(() => ID, {
    description: 'Linked record identifier',
    nullable: true,
  })
  @ValidateIf((input: CreateReminderInput) => input.sourceType !== undefined)
  @IsMongoId()
  sourceId?: string;
}
