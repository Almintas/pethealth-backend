import { registerEnumType } from '@nestjs/graphql';

export enum ReminderType {
  VACCINATION = 'VACCINATION',
  MEDICATION = 'MEDICATION',
  APPOINTMENT = 'APPOINTMENT',
  GENERAL = 'GENERAL',
}

registerEnumType(ReminderType, {
  name: 'ReminderType',
  description: 'Category of reminder',
});
