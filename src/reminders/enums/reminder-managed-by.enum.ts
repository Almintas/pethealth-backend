import { registerEnumType } from '@nestjs/graphql';

/** Who looks after a reminder; owners can edit or delete only their own. */
export enum ReminderManagedBy {
  OWNER = 'OWNER',
  /** Set by a veterinary clinic for the owner. */
  CLINIC = 'CLINIC',
  /** Created from a clinic record, e.g. a vaccination's next due date. */
  AUTOMATIC = 'AUTOMATIC',
}

registerEnumType(ReminderManagedBy, {
  name: 'ReminderManagedBy',
  description: 'Who created the reminder and may change it',
});
