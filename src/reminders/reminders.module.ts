import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';
import {
  Medication,
  MedicationSchema,
} from '../medications/schemas/medication.schema';
import { PetsModule } from '../pets/pets.module';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import {
  Vaccination,
  VaccinationSchema,
} from '../vaccinations/schemas/vaccination.schema';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { InternalRemindersResolver } from './internal-reminders.resolver';
import { RemindersResolver } from './reminders.resolver';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    PetsModule,
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Vaccination.name, schema: VaccinationSchema },
      { name: Medication.name, schema: MedicationSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Pet.name, schema: PetSchema },
    ]),
  ],
  providers: [RemindersService, RemindersResolver, InternalRemindersResolver],
  exports: [RemindersService],
})
export class RemindersModule {}
