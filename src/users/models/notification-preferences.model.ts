import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Email notification preferences for the user' })
export class NotificationPreferencesModel {
  @Field(() => Boolean, {
    description: 'Receive email reminders before appointments',
  })
  emailAppointmentReminders!: boolean;

  @Field(() => Boolean, {
    description: 'Receive email reminders for medication due dates',
  })
  emailMedicationReminders!: boolean;

  @Field(() => Boolean, {
    description: 'Receive email reminders for vaccination due dates',
  })
  emailVaccinationReminders!: boolean;
}
