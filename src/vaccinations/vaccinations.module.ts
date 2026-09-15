import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetsModule } from '../pets/pets.module';
import { Vaccination, VaccinationSchema } from './schemas/vaccination.schema';
import { VaccinationsResolver } from './vaccinations.resolver';
import { VaccinationsService } from './vaccinations.service';

@Module({
  imports: [
    PetsModule,
    MongooseModule.forFeature([
      { name: Vaccination.name, schema: VaccinationSchema },
    ]),
  ],
  providers: [VaccinationsService, VaccinationsResolver],
  exports: [VaccinationsService],
})
export class VaccinationsModule {}
