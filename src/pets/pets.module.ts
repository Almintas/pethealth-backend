import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PetPhotosModule } from '../pet-photos/pet-photos.module';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from '../medical-records/schemas/medical-record.schema';
import {
  Medication,
  MedicationSchema,
} from '../medications/schemas/medication.schema';
import {
  Vaccination,
  VaccinationSchema,
} from '../vaccinations/schemas/vaccination.schema';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import { PetOwnershipService } from './pet-ownership.service';
import { Pet, PetSchema } from './schemas/pet.schema';
import { PetPhotosController } from './pet-photos.controller';
import { PetsResolver } from './pets.resolver';
import { PetsService } from './pets.service';

@Module({
  imports: [
    AuthModule,
    PetPhotosModule,
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
      { name: Vaccination.name, schema: VaccinationSchema },
      { name: Medication.name, schema: MedicationSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Reminder.name, schema: ReminderSchema },
    ]),
  ],
  controllers: [PetPhotosController],
  providers: [PetsService, PetOwnershipService, PetsResolver],
  exports: [PetsService, PetOwnershipService],
})
export class PetsModule {}
