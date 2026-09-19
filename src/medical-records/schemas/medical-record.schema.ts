import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Pet } from '../../pets/schemas/pet.schema';

export type MedicalRecordDocument = HydratedDocument<MedicalRecord>;

@Schema({
  timestamps: true,
  collection: 'medical_records',
})
export class MedicalRecord {
  @Prop({ type: Types.ObjectId, ref: Pet.name, required: true, index: true })
  petId!: Types.ObjectId;

  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  diagnosis?: string;

  @Prop({ trim: true })
  veterinarianName?: string;

  @Prop({ trim: true })
  clinicName?: string;

  @Prop({ trim: true })
  notes?: string;

  createdAt!: Date;

  updatedAt!: Date;
}

export const MedicalRecordSchema = SchemaFactory.createForClass(MedicalRecord);

MedicalRecordSchema.index({ petId: 1, date: -1 });
