import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationDeliveryStatus } from '../enums/notification-delivery-status.enum';
import { NotificationType } from '../enums/notification-type.enum';

export type NotificationDeliveryDocument =
  HydratedDocument<NotificationDelivery>;

@Schema({
  timestamps: true,
  collection: 'notification_deliveries',
})
export class NotificationDelivery {
  @Prop({ required: true, unique: true, index: true })
  deliveryKey!: string;

  @Prop({ required: true, enum: NotificationChannel, type: String })
  channel!: NotificationChannel;

  @Prop({ required: true, enum: NotificationType, type: String })
  notificationType!: NotificationType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  petId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  appointmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  reminderId?: Types.ObjectId;

  @Prop({ required: true })
  scheduledFor!: Date;

  @Prop({
    required: true,
    enum: NotificationDeliveryStatus,
    type: String,
    default: NotificationDeliveryStatus.PENDING,
  })
  status!: NotificationDeliveryStatus;

  @Prop()
  sentAt?: Date;

  @Prop()
  providerMessageId?: string;

  @Prop({ trim: true })
  lastError?: string;

  @Prop({ default: 0 })
  attemptCount!: number;

  createdAt!: Date;

  updatedAt!: Date;
}

export const NotificationDeliverySchema =
  SchemaFactory.createForClass(NotificationDelivery);

NotificationDeliverySchema.index({ status: 1, scheduledFor: 1 });
