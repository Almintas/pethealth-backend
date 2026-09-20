import { NotificationPreferencesModel } from './models/notification-preferences.model';
import { NotificationPreferences } from './schemas/notification-preferences.schema';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './schemas/notification-preferences.schema';

export function resolveNotificationPreferences(
  stored?: NotificationPreferences | null,
): NotificationPreferencesModel {
  return {
    emailAppointmentReminders:
      stored?.emailAppointmentReminders ??
      DEFAULT_NOTIFICATION_PREFERENCES.emailAppointmentReminders,
    emailMedicationReminders:
      stored?.emailMedicationReminders ??
      DEFAULT_NOTIFICATION_PREFERENCES.emailMedicationReminders,
    emailVaccinationReminders:
      stored?.emailVaccinationReminders ??
      DEFAULT_NOTIFICATION_PREFERENCES.emailVaccinationReminders,
  };
}
