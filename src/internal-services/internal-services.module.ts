import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetsModule } from '../pets/pets.module';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import { UsersModule } from '../users/users.module';
import { InternalServiceGuard } from './guards/internal-service.guard';
import { AppointmentsModule } from '../appointments/appointments.module';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';
import { MedicationsModule } from '../medications/medications.module';
import { VaccinationsModule } from '../vaccinations/vaccinations.module';
import { InternalAppointmentsResolver } from './internal-appointments.resolver';
import { InternalAppointmentsService } from './internal-appointments.service';
import { InternalMedicalRecordsResolver } from './internal-medical-records.resolver';
import { InternalMedicalRecordsService } from './internal-medical-records.service';
import { InternalMedicationsResolver } from './internal-medications.resolver';
import { InternalMedicationsService } from './internal-medications.service';
import { InternalVaccinationsResolver } from './internal-vaccinations.resolver';
import { InternalVaccinationsService } from './internal-vaccinations.service';
import { InternalPetsResolver } from './internal-pets.resolver';
import { InternalPetsService } from './internal-pets.service';

@Module({
  imports: [
    UsersModule,
    PetsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    MedicationsModule,
    VaccinationsModule,
    MongooseModule.forFeature([{ name: Pet.name, schema: PetSchema }]),
  ],
  providers: [
    InternalPetsService,
    InternalPetsResolver,
    InternalAppointmentsService,
    InternalAppointmentsResolver,
    InternalMedicalRecordsService,
    InternalMedicalRecordsResolver,
    InternalMedicationsService,
    InternalMedicationsResolver,
    InternalVaccinationsService,
    InternalVaccinationsResolver,
    InternalServiceGuard,
  ],
  exports: [
    InternalPetsService,
    InternalAppointmentsService,
    InternalMedicalRecordsService,
    InternalMedicationsService,
    InternalVaccinationsService,
  ],
})
export class InternalServicesModule {}
