import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Pet } from '../../pets/schemas/pet.schema';
import { User } from '../../users/schemas/user.schema';

export type PetShareCodeDocument = HydratedDocument<PetShareCode>;

/**
 * Short-lived, single-use code an owner shows to a veterinary clinic to grant
 * it access to one pet. Only the SHA-256 hash of the code is stored.
 */
@Schema({ timestamps: true, collection: 'pet_share_codes' })
export class PetShareCode {
  @Prop({ type: Types.ObjectId, ref: Pet.name, required: true, index: true })
  petId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  codeHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  /** Vet-system clinic id that redeemed the code (for audit). */
  @Prop({ type: String, default: null })
  usedByVetClinicId!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PetShareCodeSchema = SchemaFactory.createForClass(PetShareCode);

// Keep used/expired codes for a day for audit, then let MongoDB remove them.
PetShareCodeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 24 * 60 * 60 },
);
