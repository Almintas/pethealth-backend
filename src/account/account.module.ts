import { AttachmentFilesModule } from '../attachments/attachment-files.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';
import {
  AccountActivationToken,
  AccountActivationTokenSchema,
} from '../auth/account-activation/schemas/account-activation-token.schema';
import { AuthModule } from '../auth/auth.module';
import { PasswordService } from '../auth/password.service';
import { ClinicAccessModule } from '../clinic-access/clinic-access.module';
import {
  PetShareCode,
  PetShareCodeSchema,
} from '../clinic-access/schemas/pet-share-code.schema';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from '../medical-records/schemas/medical-record.schema';
import {
  Medication,
  MedicationSchema,
} from '../medications/schemas/medication.schema';
import {
  NotificationDelivery,
  NotificationDeliverySchema,
} from '../notifications/schemas/notification-delivery.schema';
import { PetPhotosModule } from '../pet-photos/pet-photos.module';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  Vaccination,
  VaccinationSchema,
} from '../vaccinations/schemas/vaccination.schema';
import { AccountDataService } from './account-data.service';
import { AccountResolver } from './account.resolver';

@Module({
  imports: [
    AuthModule,
    AttachmentFilesModule,
    ClinicAccessModule,
    PetPhotosModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
      { name: Vaccination.name, schema: VaccinationSchema },
      { name: Medication.name, schema: MedicationSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: PetShareCode.name, schema: PetShareCodeSchema },
      { name: NotificationDelivery.name, schema: NotificationDeliverySchema },
      {
        name: AccountActivationToken.name,
        schema: AccountActivationTokenSchema,
      },
    ]),
  ],
  providers: [AccountDataService, AccountResolver, PasswordService],
})
export class AccountModule {}
