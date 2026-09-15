import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Pet } from '../../pets/schemas/pet.schema';

export type MedicationDocument = HydratedDocument<Medication>;

@Schema({
  timestamps: true,
  collection: 'medications',
})
export class Medication {
  @Prop({ type: Types.ObjectId, ref: Pet.name, required: true, index: true })
  petId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  dosage!: number;

  @Prop({ required: true, trim: true })
  dosageUnit!: string;

  @Prop({ required: true, trim: true })
  frequency!: string;

  @Prop({ required: true })
  startDate!: Date;

  @Prop()
  endDate?: Date;

  @Prop({ trim: true })
  veterinarianName?: string;

  @Prop({ trim: true })
  clinicName?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}

export const MedicationSchema = SchemaFactory.createForClass(Medication);

MedicationSchema.index({ petId: 1, startDate: -1 });
