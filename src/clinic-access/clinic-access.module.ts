import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { InternalServiceGuard } from '../internal-services/guards/internal-service.guard';
import { InternalServicesModule } from '../internal-services/internal-services.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PetsModule } from '../pets/pets.module';
import { ClinicAccessResolver } from './clinic-access.resolver';
import { ClinicAccessService } from './clinic-access.service';
import { InternalShareCodesResolver } from './internal-share-codes.resolver';
import {
  PetShareCode,
  PetShareCodeSchema,
} from './schemas/pet-share-code.schema';
import { VetBackendClient } from './vet-backend.client';

@Module({
  imports: [
    AuthModule,
    PetsModule,
    InternalServicesModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: PetShareCode.name, schema: PetShareCodeSchema },
    ]),
  ],
  providers: [
    ClinicAccessService,
    ClinicAccessResolver,
    InternalShareCodesResolver,
    InternalServiceGuard,
    VetBackendClient,
  ],
})
export class ClinicAccessModule {}
