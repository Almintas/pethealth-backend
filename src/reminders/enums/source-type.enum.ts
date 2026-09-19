import { registerEnumType } from '@nestjs/graphql';

export enum SourceType {
  VACCINATION = 'VACCINATION',
  MEDICATION = 'MEDICATION',
  APPOINTMENT = 'APPOINTMENT',
}

registerEnumType(SourceType, {
  name: 'SourceType',
  description: 'Type of linked domain record for a reminder',
});
