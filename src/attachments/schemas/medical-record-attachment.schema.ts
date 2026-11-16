import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MedicalRecordAttachmentDocument =
  HydratedDocument<MedicalRecordAttachment>;

/**
 * A file (lab result, X-ray…) attached to a medical record by a clinic.
 * The bytes live in the attachment storage under `storageKey`.
 */
@Schema({
  timestamps: true,
  collection: 'medical_record_attachments',
})
export class MedicalRecordAttachment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  medicalRecordId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  petId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true })
  contentType!: string;

  @Prop({ required: true })
  size!: number;

  /** Storage id of the file bytes; never exposed through the API. */
  @Prop({ required: true })
  storageKey!: string;

  /** Clinic that attached the file (vet backend id), if a clinic did. */
  @Prop({ trim: true })
  clinicId?: string;

  @Prop({ trim: true })
  clinicName?: string;

  @Prop({ trim: true })
  uploadedByName?: string;

  createdAt!: Date;

  updatedAt!: Date;
}

export const MedicalRecordAttachmentSchema = SchemaFactory.createForClass(
  MedicalRecordAttachment,
);

MedicalRecordAttachmentSchema.index({ medicalRecordId: 1, createdAt: 1 });
