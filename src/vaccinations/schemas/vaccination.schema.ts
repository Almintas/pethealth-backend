import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Pet } from '../../pets/schemas/pet.schema';

export type VaccinationDocument = HydratedDocument<Vaccination>;

@Schema({
  timestamps: true,
  collection: 'vaccinations',
})
export class Vaccination {
  @Prop({ type: Types.ObjectId, ref: Pet.name, required: true, index: true })
  petId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  vaccineName!: string;

  @Prop({ required: true })
  administeredAt!: Date;

  @Prop()
  nextDueAt?: Date;

  @Prop({ trim: true })
  veterinarianName?: string;

  @Prop({ trim: true })
  clinicName?: string;

  @Prop({ trim: true })
  batchNumber?: string;

  @Prop({ trim: true })
  notes?: string;

  createdAt!: Date;

  updatedAt!: Date;
}

export const VaccinationSchema = SchemaFactory.createForClass(Vaccination);

VaccinationSchema.index({ petId: 1, administeredAt: -1 });
VaccinationSchema.index({ nextDueAt: 1 });
