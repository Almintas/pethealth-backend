import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentStatus } from '../appointments/enums/appointment-status.enum';
import {
  Appointment,
  AppointmentDocument,
} from '../appointments/schemas/appointment.schema';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { ReminderStatus } from '../reminders/enums/reminder-status.enum';
import { ReminderType } from '../reminders/enums/reminder-type.enum';
import {
  Reminder,
  ReminderDocument,
} from '../reminders/schemas/reminder.schema';
import { resolveNotificationPreferences } from '../users/notification-preferences.util';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from './email.service';
import {
  buildAppointmentReminderEmail,
  buildMedicationReminderEmail,
  buildTestEmail,
  buildVaccinationReminderEmail,
  formatUtcDate,
  formatUtcTime,
} from './email-templates';
import { NotificationChannel } from './enums/notification-channel.enum';
import { NotificationType } from './enums/notification-type.enum';
import {
  buildDeliveryKey,
  NotificationDeliveryService,
} from './notification-delivery.service';

const APPOINTMENT_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
const MAX_CATCHUP_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationEmailDispatcher {
  private readonly logger = new Logger(NotificationEmailDispatcher.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly deliveryService: NotificationDeliveryService,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async processDueNotifications(): Promise<void> {
    if (!this.emailService.isConfigured()) {
      return;
    }

    const now = new Date();
    await this.processAppointmentReminders(now);
    await this.processReminderEmails(now, ReminderType.MEDICATION);
    await this.processReminderEmails(now, ReminderType.VACCINATION);
  }

  async sendTestEmailToUser(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    if (!user?.email) {
      return false;
    }

    const userName = `${user.firstName} ${user.lastName}`.trim() || 'there';
    const { subject, html, text } = buildTestEmail({ userName });

    const result = await this.emailService.send({
      to: user.email,
      subject,
      html,
      text,
    });

    return result.ok;
  }

  private async processAppointmentReminders(now: Date): Promise<void> {
    const catchupStart = new Date(now.getTime() - MAX_CATCHUP_MS);
    const appointments = await this.appointmentModel
      .find({
        status: AppointmentStatus.SCHEDULED,
        scheduledAt: { $gt: now },
      })
      .exec();

    for (const appointment of appointments) {
      const scheduledFor = new Date(
        appointment.scheduledAt.getTime() - APPOINTMENT_REMINDER_LEAD_MS,
      );

      if (scheduledFor > now || scheduledFor < catchupStart) {
        continue;
      }

      const pet = await this.petModel.findById(appointment.petId).exec();
      if (!pet || pet.deletedAt) {
        continue;
      }

      const user = await this.userModel.findById(pet.ownerId).exec();
      if (!user?.email) {
        continue;
      }

      const prefs = resolveNotificationPreferences(
        user.notificationPreferences,
      );
      if (!prefs.emailAppointmentReminders) {
        continue;
      }

      const appointmentId = appointment._id.toString();
      const deliveryKey = buildDeliveryKey(
        NotificationChannel.EMAIL,
        NotificationType.APPOINTMENT_REMINDER_24H,
        appointmentId,
        scheduledFor,
      );

      const action = await this.deliveryService.tryBeginDelivery({
        deliveryKey,
        channel: NotificationChannel.EMAIL,
        notificationType: NotificationType.APPOINTMENT_REMINDER_24H,
        userId: user._id.toString(),
        petId: pet._id.toString(),
        appointmentId,
        scheduledFor,
      });

      if (action === 'skip') {
        continue;
      }

      const userName = `${user.firstName} ${user.lastName}`.trim() || 'there';
      const viewUrl = this.buildPetUrl(pet._id.toString());

      const { subject, html, text } = buildAppointmentReminderEmail({
        userName,
        petName: pet.name,
        dateLabel: formatUtcDate(appointment.scheduledAt),
        timeLabel: formatUtcTime(appointment.scheduledAt),
        type: appointment.type,
        clinicName: appointment.clinicName,
        veterinarianName: appointment.veterinarianName,
        viewUrl,
      });

      await this.dispatchEmail({
        deliveryKey,
        to: user.email,
        subject,
        html,
        text,
      });
    }
  }

  private async processReminderEmails(
    now: Date,
    reminderType: ReminderType.MEDICATION | ReminderType.VACCINATION,
  ): Promise<void> {
    const catchupStart = new Date(now.getTime() - MAX_CATCHUP_MS);
    const notificationType =
      reminderType === ReminderType.MEDICATION
        ? NotificationType.MEDICATION_REMINDER
        : NotificationType.VACCINATION_REMINDER;

    const reminders = await this.reminderModel
      .find({
        type: reminderType,
        status: ReminderStatus.PENDING,
        dueAt: { $lte: now, $gte: catchupStart },
      })
      .exec();

    for (const reminder of reminders) {
      const pet = await this.petModel.findById(reminder.petId).exec();
      if (!pet || pet.deletedAt) {
        continue;
      }

      const user = await this.userModel.findById(pet.ownerId).exec();
      if (!user?.email) {
        continue;
      }

      const prefs = resolveNotificationPreferences(
        user.notificationPreferences,
      );
      const enabled =
        reminderType === ReminderType.MEDICATION
          ? prefs.emailMedicationReminders
          : prefs.emailVaccinationReminders;

      if (!enabled) {
        continue;
      }

      const reminderId = reminder._id.toString();
      const scheduledFor = reminder.dueAt;
      const deliveryKey = buildDeliveryKey(
        NotificationChannel.EMAIL,
        notificationType,
        reminderId,
        scheduledFor,
      );

      const action = await this.deliveryService.tryBeginDelivery({
        deliveryKey,
        channel: NotificationChannel.EMAIL,
        notificationType,
        userId: user._id.toString(),
        petId: pet._id.toString(),
        reminderId,
        scheduledFor,
      });

      if (action === 'skip') {
        continue;
      }

      const userName = `${user.firstName} ${user.lastName}`.trim() || 'there';
      const viewUrl = this.buildPetUrl(pet._id.toString());

      if (reminderType === ReminderType.MEDICATION) {
        const { subject, html, text } = buildMedicationReminderEmail({
          userName,
          petName: pet.name,
          medicationName: reminder.title,
          timeLabel: formatUtcTime(reminder.dueAt),
          viewUrl,
        });

        await this.dispatchEmail({
          deliveryKey,
          to: user.email,
          subject,
          html,
          text,
        });
        continue;
      }

      const { subject, html, text } = buildVaccinationReminderEmail({
        userName,
        petName: pet.name,
        vaccinationName: reminder.title,
        dateLabel: formatUtcDate(reminder.dueAt),
        viewUrl,
      });

      await this.dispatchEmail({
        deliveryKey,
        to: user.email,
        subject,
        html,
        text,
      });
    }
  }

  private async dispatchEmail(params: {
    deliveryKey: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      const result = await this.emailService.send({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      if (result.ok) {
        await this.deliveryService.markSent(
          params.deliveryKey,
          result.messageId,
        );
        return;
      }

      await this.deliveryService.markFailed(
        params.deliveryKey,
        result.errorMessage,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected email dispatch error';
      this.logger.error(`Notification dispatch failed: ${message}`);
      await this.deliveryService.markFailed(params.deliveryKey, message);
    }
  }

  private buildPetUrl(petId: string): string {
    const base =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      'http://localhost:5173';
    const normalized = base.replace(/\/$/, '');
    return `${normalized}/pets/${petId}`;
  }
}
