import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { AppointmentStatus } from '../enums/appointment-status.enum';

@ObjectType({ description: 'Veterinary appointment for a pet' })
export class AppointmentModel {
  @Field(() => ID, { description: 'Unique appointment identifier' })
  id!: string;

  @Field(() => ID, { description: 'Pet this appointment belongs to' })
  petId!: string;

  @Field(() => GraphQLISODateTime, {
    description: 'Scheduled date and time',
  })
  scheduledAt!: Date;

  @Field(() => String, { description: 'Appointment type' })
  type!: string;

  @Field(() => String, { description: 'Clinic name', nullable: true })
  clinicName?: string;

  @Field(() => String, { description: 'Veterinarian name', nullable: true })
  veterinarianName?: string;

  @Field(() => String, { description: 'Reason for visit', nullable: true })
  reason?: string;

  @Field(() => String, { description: 'Additional notes', nullable: true })
  notes?: string;

  @Field(() => AppointmentStatus, { description: 'Appointment status' })
  status!: AppointmentStatus;

  @Field(() => GraphQLISODateTime, { description: 'Record creation time' })
  createdAt!: Date;

  @Field(() => GraphQLISODateTime, { description: 'Last update time' })
  updatedAt!: Date;
}
