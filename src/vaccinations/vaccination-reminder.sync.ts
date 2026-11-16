import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReminderStatus } from '../reminders/enums/reminder-status.enum';
import { ReminderType } from '../reminders/enums/reminder-type.enum';
import { SourceType } from '../reminders/enums/source-type.enum';
import {
  Reminder,
  ReminderDocument,
} from '../reminders/schemas/reminder.schema';
import type { VaccinationDocument } from './schemas/vaccination.schema';

/**
 * Keeps one automatic reminder per vaccination with a next due date, so the
 * owner is reminded (and emailed) when the vaccine needs renewing. Failures
 * are logged and never block saving the vaccination.
 */
@Injectable()
export class VaccinationReminderSync {
  private readonly logger = new Logger(VaccinationReminderSync.name);

  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
  ) {}

  private filterFor(vaccinationId: Types.ObjectId) {
    return {
      sourceType: SourceType.VACCINATION,
      sourceId: vaccinationId,
      automatic: true,
    };
  }

  async sync(vaccination: VaccinationDocument): Promise<void> {
    try {
      const filter = this.filterFor(vaccination._id);
      const dueAt = vaccination.nextDueAt;
      if (!dueAt) {
        await this.reminderModel
          .deleteMany({ ...filter, status: ReminderStatus.PENDING })
          .exec();
        return;
      }

      const existing = await this.reminderModel.findOne(filter).exec();
      if (!existing) {
        await this.reminderModel.create({
          ...filter,
          petId: vaccination.petId,
          type: ReminderType.VACCINATION,
          title: vaccination.vaccineName,
          dueAt,
          status: ReminderStatus.PENDING,
          clinicName: vaccination.clinicName,
        });
        return;
      }

      // A new due date starts a new reminder cycle, even if the owner had
      // completed or dismissed the previous one.
      if (existing.dueAt.getTime() !== dueAt.getTime()) {
        existing.dueAt = dueAt;
        existing.status = ReminderStatus.PENDING;
      }
      existing.title = vaccination.vaccineName;
      existing.clinicName = vaccination.clinicName;
      await existing.save();
    } catch (error: unknown) {
      this.logger.warn(
        `Vaccination reminder sync failed for ${vaccination._id.toString()}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async remove(vaccinationId: Types.ObjectId): Promise<void> {
    try {
      await this.reminderModel.deleteMany(this.filterFor(vaccinationId)).exec();
    } catch (error: unknown) {
      this.logger.warn(
        `Vaccination reminder cleanup failed for ${vaccinationId.toString()}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
