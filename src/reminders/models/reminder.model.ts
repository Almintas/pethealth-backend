import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { ReminderManagedBy } from '../enums/reminder-managed-by.enum';
import { ReminderStatus } from '../enums/reminder-status.enum';
import { ReminderType } from '../enums/reminder-type.enum';
import { SourceType } from '../enums/source-type.enum';

@ObjectType({ description: 'Reminder for a pet' })
export class ReminderModel {
  @Field(() => ID, { description: 'Unique reminder identifier' })
  id!: string;

  @Field(() => ID, { description: 'Pet this reminder belongs to' })
  petId!: string;

  @Field(() => ReminderType, { description: 'Reminder category' })
  type!: ReminderType;

  @Field(() => String, { description: 'Reminder title' })
  title!: string;

  @Field(() => String, { description: 'Reminder message', nullable: true })
  message?: string;

  @Field(() => GraphQLISODateTime, { description: 'When the reminder is due' })
  dueAt!: Date;

  @Field(() => ReminderStatus, { description: 'Reminder status' })
  status!: ReminderStatus;

  @Field(() => SourceType, {
    description: 'Linked record type',
    nullable: true,
  })
  sourceType?: SourceType;

  @Field(() => ID, {
    description: 'Linked record identifier',
    nullable: true,
  })
  sourceId?: string;

  @Field(() => ReminderManagedBy, {
    description:
      'OWNER reminders can be edited; CLINIC and AUTOMATIC ones can only be completed or dismissed',
  })
  managedBy!: ReminderManagedBy;

  @Field(() => String, {
    description: 'Clinic that set the reminder or recorded its source',
    nullable: true,
  })
  clinicName?: string;

  @Field(() => String, {
    description: 'Clinic staff member who set the reminder',
    nullable: true,
  })
  createdByName?: string;

  @Field(() => ID, {
    description: 'Vet backend clinic id when a clinic set the reminder',
    nullable: true,
  })
  clinicId?: string;

  @Field(() => GraphQLISODateTime, { description: 'Record creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;
}
