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
/** A PENDING delivery older than this is treated as abandoned and retried. */
const STALE_PENDING_MS = 30 * 60 * 1000;

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

    if (existing) {
      if (!this.isRetryable(existing)) {
        return 'skip';
      }
      /*
       * Claim the delivery atomically: the filter only matches if nobody else
       * (another tick or another instance) changed the record since we read it.
       */
      const claimed = await this.deliveryModel
        .findOneAndUpdate(
          {
            _id: existing._id,
            status: existing.status,
            attemptCount: existing.attemptCount,
          },
          {
            $set: { status: NotificationDeliveryStatus.PENDING },
            $inc: { attemptCount: 1 },
          },
          { new: true },
        )
        .exec();
      return claimed ? 'send' : 'skip';
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

  private isRetryable(existing: NotificationDeliveryDocument): boolean {
    if (existing.status === NotificationDeliveryStatus.SENT) {
      return false;
    }
    if (existing.attemptCount >= MAX_ATTEMPTS) {
      return false;
    }
    const sinceLastUpdateMs = Date.now() - existing.updatedAt.getTime();
    if (existing.status === NotificationDeliveryStatus.FAILED) {
      return sinceLastUpdateMs >= RETRY_MIN_INTERVAL_MS;
    }
    /*
     * PENDING means a send is in flight (or the process died mid-send). Only
     * retry once the claim is clearly stale, otherwise every scheduler tick
     * would re-send the same email.
     */
    return sinceLastUpdateMs >= STALE_PENDING_MS;
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
          },
          $unset: { lastError: 1 },
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
