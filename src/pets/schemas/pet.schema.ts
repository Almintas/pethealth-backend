import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type PetDocument = HydratedDocument<Pet>;

@Schema({
  timestamps: true,
  collection: 'pets',
})
export class Pet {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  species!: string;

  @Prop({ trim: true })
  breed?: string;

  @Prop({ trim: true })
  gender?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ trim: true })
  microchipNumber?: string;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;

  createdAt!: Date;

  updatedAt!: Date;
}

export const PetSchema = SchemaFactory.createForClass(Pet);

PetSchema.index({ ownerId: 1, createdAt: -1 });
PetSchema.index({ ownerId: 1, deletedAt: 1 });
