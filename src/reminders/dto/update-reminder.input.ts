import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsOptionalNonNullable } from '../../common/validation/is-optional-non-nullable.decorator';
import { ReminderType } from '../enums/reminder-type.enum';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

@InputType({ description: 'Input for updating a reminder' })
export class UpdateReminderInput {
  @Field(() => ReminderType, {
    description: 'Reminder category',
    nullable: true,
  })
  @IsOptionalNonNullable()
  @IsEnum(ReminderType)
  type?: ReminderType;

  @Field(() => String, { description: 'Reminder title', nullable: true })
  @IsOptionalNonNullable()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(trimString)
  title?: string;

  @Field(() => String, { description: 'Reminder message', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  message?: string;

  @Field(() => GraphQLISODateTime, {
    description: 'When the reminder is due',
    nullable: true,
  })
  @IsOptionalNonNullable()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;
}
