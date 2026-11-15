import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';
import {
  NotificationPreferences,
  NotificationPreferencesSchema,
} from './notification-preferences.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({
    required: true,
    enum: UserRole,
    type: String,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Prop({ select: false })
  passwordHash?: string;

  /** Incremented whenever the password changes; JWTs carrying an older value are rejected. */
  @Prop({ default: 0, select: false })
  tokenVersion?: number;

  /** SHA-256 of the single-use password reset / account setup token. */
  @Prop({ select: false, index: true, sparse: true })
  passwordResetTokenHash?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  @Prop({
    type: NotificationPreferencesSchema,
    default: () => ({}),
  })
  notificationPreferences!: NotificationPreferences;

  createdAt!: Date;

  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
