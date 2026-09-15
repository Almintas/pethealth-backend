import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetsModule } from '../pets/pets.module';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { RemindersResolver } from './reminders.resolver';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    PetsModule,
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
    ]),
  ],
  providers: [RemindersService, RemindersResolver],
  exports: [RemindersService],
})
export class RemindersModule {}
