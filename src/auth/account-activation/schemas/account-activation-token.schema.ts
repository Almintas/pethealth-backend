import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../../users/schemas/user.schema';

export type AccountActivationTokenDocument =
  HydratedDocument<AccountActivationToken>;

/**
 * One-time token that lets the owner of an email address set a password on a
 * placeholder account created by a veterinary clinic. Only the SHA-256 hash of
 * the token is stored.
 */
@Schema({ timestamps: true, collection: 'account_activation_tokens' })
export class AccountActivationToken {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AccountActivationTokenSchema = SchemaFactory.createForClass(
  AccountActivationToken,
);

// Expired tokens are removed by MongoDB automatically.
AccountActivationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
