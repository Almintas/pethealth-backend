import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Pet } from '../../pets/schemas/pet.schema';
import { ReminderStatus } from '../enums/reminder-status.enum';
import { ReminderType } from '../enums/reminder-type.enum';
import { SourceType } from '../enums/source-type.enum';

export type ReminderDocument = HydratedDocument<Reminder>;

@Schema({
  timestamps: true,
  collection: 'reminders',
})
export class Reminder {
  @Prop({ type: Types.ObjectId, ref: Pet.name, required: true })
  petId!: Types.ObjectId;

  @Prop({ required: true, enum: ReminderType, type: String })
  type!: ReminderType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  message?: string;

  @Prop({ required: true })
  dueAt!: Date;

  @Prop({
    required: true,
    enum: ReminderStatus,
    type: String,
    default: ReminderStatus.PENDING,
  })
  status!: ReminderStatus;

  @Prop({ enum: SourceType, type: String })
  sourceType?: SourceType;

  @Prop({ type: Types.ObjectId })
  sourceId?: Types.ObjectId;

  createdAt!: Date;

  updatedAt!: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

ReminderSchema.index({ petId: 1, dueAt: 1 });
ReminderSchema.index({ status: 1, dueAt: 1 });
