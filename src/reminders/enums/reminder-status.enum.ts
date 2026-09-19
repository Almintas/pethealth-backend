import { registerEnumType } from '@nestjs/graphql';

export enum ReminderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  DISMISSED = 'DISMISSED',
}

registerEnumType(ReminderStatus, {
  name: 'ReminderStatus',
  description: 'Lifecycle status of a reminder',
});
