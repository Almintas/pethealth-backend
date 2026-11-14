import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class NotificationPreferences {
  @Prop({ default: true })
  emailAppointmentReminders!: boolean;

  @Prop({ default: true })
  emailMedicationReminders!: boolean;

  @Prop({ default: true })
  emailVaccinationReminders!: boolean;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(
  NotificationPreferences,
);

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailAppointmentReminders: true,
  emailMedicationReminders: true,
  emailVaccinationReminders: true,
} as const;
