import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { InternalMicrochipResolver } from './internal-microchip.resolver';
import { MicrochipService } from './microchip.service';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [MicrochipService, InternalMicrochipResolver],
})
export class MicrochipModule {}
