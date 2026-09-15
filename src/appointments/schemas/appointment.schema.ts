import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Pet } from '../../pets/schemas/pet.schema';
import { AppointmentStatus } from '../enums/appointment-status.enum';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({
  timestamps: true,
  collection: 'appointments',
})
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: Pet.name, required: true })
  petId!: Types.ObjectId;

  @Prop({ required: true })
  scheduledAt!: Date;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ trim: true })
  clinicName?: string;

  @Prop({ trim: true })
  veterinarianName?: string;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({
    required: true,
    enum: AppointmentStatus,
    type: String,
    default: AppointmentStatus.SCHEDULED,
  })
  status!: AppointmentStatus;

  createdAt!: Date;

  updatedAt!: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

AppointmentSchema.index({ petId: 1, scheduledAt: 1 });
AppointmentSchema.index({ status: 1, scheduledAt: 1 });
