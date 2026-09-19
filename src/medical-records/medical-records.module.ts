import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PetsModule } from '../pets/pets.module';
import { MedicalRecordsResolver } from './medical-records.resolver';
import { MedicalRecordsService } from './medical-records.service';
import {
  MedicalRecord,
  MedicalRecordSchema,
} from './schemas/medical-record.schema';

@Module({
  imports: [
    AuthModule,
    PetsModule,
    MongooseModule.forFeature([
      { name: MedicalRecord.name, schema: MedicalRecordSchema },
    ]),
  ],
  providers: [MedicalRecordsService, MedicalRecordsResolver],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
