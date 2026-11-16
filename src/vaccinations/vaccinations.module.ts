import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import { PetsModule } from '../pets/pets.module';
import { Vaccination, VaccinationSchema } from './schemas/vaccination.schema';
import { VaccinationsResolver } from './vaccinations.resolver';
import { VaccinationReminderSync } from './vaccination-reminder.sync';
import { VaccinationsService } from './vaccinations.service';

@Module({
  imports: [
    AuthModule,
    PetsModule,
    MongooseModule.forFeature([
      { name: Vaccination.name, schema: VaccinationSchema },
      { name: Pet.name, schema: PetSchema },
      { name: Reminder.name, schema: ReminderSchema },
    ]),
  ],
  providers: [
    VaccinationsService,
    VaccinationsResolver,
    VaccinationReminderSync,
  ],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
