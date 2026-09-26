import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationChannel } from './enums/notification-channel.enum';
import { NotificationDeliveryStatus } from './enums/notification-delivery-status.enum';
import { NotificationType } from './enums/notification-type.enum';
import {
  NotificationDelivery,
  NotificationDeliveryDocument,
} from './schemas/notification-delivery.schema';

const RETRY_MIN_INTERVAL_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function buildDeliveryKey(
  channel: NotificationChannel,
  notificationType: NotificationType,
  sourceId: string,
  scheduledFor: Date,
): string {
  return `${channel}:${notificationType}:${sourceId}:${scheduledFor.toISOString()}`;
}

@Injectable()
export class NotificationDeliveryService {
  constructor(
    @InjectModel(NotificationDelivery.name)
    private readonly deliveryModel: Model<NotificationDeliveryDocument>,
  ) {}

  async tryBeginDelivery(params: {
    deliveryKey: string;
    channel: NotificationChannel;
    notificationType: NotificationType;
    userId: string;
    petId?: string;
    appointmentId?: string;
    reminderId?: string;
    scheduledFor: Date;
  }): Promise<'send' | 'skip'> {
    const existing = await this.deliveryModel
      .findOne({ deliveryKey: params.deliveryKey })
      .exec();

    if (existing?.status === NotificationDeliveryStatus.SENT) {
      return 'skip';
    }

    if (existing?.status === NotificationDeliveryStatus.FAILED) {
      const tooSoon =
        Date.now() - existing.updatedAt.getTime() < RETRY_MIN_INTERVAL_MS;
      if (tooSoon || existing.attemptCount >= MAX_ATTEMPTS) {
        return 'skip';
      }
    }

    if (existing) {
      await this.deliveryModel
        .updateOne(
          { _id: existing._id },
          {
            $set: { status: NotificationDeliveryStatus.PENDING },
            $inc: { attemptCount: 1 },
          },
        )
        .exec();
      return 'send';
    }

    try {
      await this.deliveryModel.create({
        deliveryKey: params.deliveryKey,
        channel: params.channel,
        notificationType: params.notificationType,
        userId: new Types.ObjectId(params.userId),
        petId: params.petId ? new Types.ObjectId(params.petId) : undefined,
        appointmentId: params.appointmentId
          ? new Types.ObjectId(params.appointmentId)
          : undefined,
        reminderId: params.reminderId
          ? new Types.ObjectId(params.reminderId)
          : undefined,
        scheduledFor: params.scheduledFor,
        status: NotificationDeliveryStatus.PENDING,
        attemptCount: 1,
      });
      return 'send';
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        return 'skip';
      }
      throw error;
    }
  }

  async markSent(
    deliveryKey: string,
    providerMessageId: string,
  ): Promise<void> {
    await this.deliveryModel
      .updateOne(
        { deliveryKey },
        {
          $set: {
            status: NotificationDeliveryStatus.SENT,
            sentAt: new Date(),
            providerMessageId,
            lastError: undefined,
          },
        },
      )
      .exec();
  }

  async markFailed(deliveryKey: string, errorMessage: string): Promise<void> {
    await this.deliveryModel
      .updateOne(
        { deliveryKey },
        {
          $set: {
            status: NotificationDeliveryStatus.FAILED,
            lastError: errorMessage.slice(0, 500),
          },
        },
      )
      .exec();
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
