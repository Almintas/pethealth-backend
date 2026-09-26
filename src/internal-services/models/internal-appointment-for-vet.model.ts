import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { AppointmentStatus } from '../../appointments/enums/appointment-status.enum';

@ObjectType()
export class InternalAppointmentForVet {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  petId!: string;

  @Field(() => GraphQLISODateTime)
  scheduledAt!: Date;

  @Field()
  type!: string;

  @Field({ nullable: true })
  vetClinicId?: string;

  @Field({ nullable: true })
  clinicName?: string;

  @Field({ nullable: true })
  veterinarianName?: string;

  @Field({ nullable: true })
  reason?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => AppointmentStatus)
  status!: AppointmentStatus;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
