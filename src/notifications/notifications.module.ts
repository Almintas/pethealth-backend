import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';
import { Pet, PetSchema } from '../pets/schemas/pet.schema';
import { Reminder, ReminderSchema } from '../reminders/schemas/reminder.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EmailService } from './email.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationEmailDispatcher } from './notification-email.dispatcher';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationsResolver } from './notifications.resolver';
import {
  NotificationDelivery,
  NotificationDeliverySchema,
} from './schemas/notification-delivery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationDelivery.name, schema: NotificationDeliverySchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: Pet.name, schema: PetSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [
    EmailService,
    NotificationDeliveryService,
    NotificationEmailDispatcher,
    NotificationSchedulerService,
    NotificationsResolver,
  ],
  exports: [EmailService, NotificationEmailDispatcher],
})
export class NotificationsModule {}
