import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetsModule } from '../pets/pets.module';
import { Medication, MedicationSchema } from './schemas/medication.schema';
import { MedicationsResolver } from './medications.resolver';
import { MedicationsService } from './medications.service';

@Module({
  imports: [
    PetsModule,
    MongooseModule.forFeature([
      { name: Medication.name, schema: MedicationSchema },
    ]),
  ],
  providers: [MedicationsService, MedicationsResolver],
  exports: [MedicationsService],
})
export class MedicationsModule {}
