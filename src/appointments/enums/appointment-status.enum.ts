import { registerEnumType } from '@nestjs/graphql';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(AppointmentStatus, {
  name: 'AppointmentStatus',
  description: 'Status of a veterinary appointment',
});
