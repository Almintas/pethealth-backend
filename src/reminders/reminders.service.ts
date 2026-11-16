import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types, isValidObjectId } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../appointments/schemas/appointment.schema';
import {
  Medication,
  MedicationDocument,
} from '../medications/schemas/medication.schema';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import {
  Vaccination,
  VaccinationDocument,
} from '../vaccinations/schemas/vaccination.schema';
import { SourceType } from './enums/source-type.enum';
import { CreateReminderInput } from './dto/create-reminder.input';
import { UpdateReminderInput } from './dto/update-reminder.input';
import { ReminderManagedBy } from './enums/reminder-managed-by.enum';
import { ReminderStatus } from './enums/reminder-status.enum';
import { ReminderType } from './enums/reminder-type.enum';
import { ReminderModel } from './models/reminder.model';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';

export const MANAGED_REMINDER_MESSAGE =
  'This reminder comes from your veterinary clinic. You can mark it done or dismiss it.';
export const OTHER_CLINIC_REMINDER_MESSAGE =
  'Only the clinic that set this reminder can remove it.';

export type ClinicReminderInput = {
  petId: string;
  type: ReminderType;
  title: string;
  message?: string;
  dueAt: Date;
  clinicId: string;
  clinicName: string;
  createdByName?: string;
};

export function reminderManagedBy(reminder: {
  automatic?: boolean;
  clinicId?: string;
}): ReminderManagedBy {
  if (reminder.automatic) {
    return ReminderManagedBy.AUTOMATIC;
  }
  return reminder.clinicId ? ReminderManagedBy.CLINIC : ReminderManagedBy.OWNER;
}

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    private readonly petOwnershipService: PetOwnershipService,
    @InjectModel(Vaccination.name)
    private readonly vaccinationModel: Model<VaccinationDocument>,
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<MedicationDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
  ) {}

  async createReminder(
    ownerId: string,
    input: CreateReminderInput,
  ): Promise<ReminderModel> {
    const dto = await this.validateCreateInput(input);
    this.assertValidDate(dto.dueAt, 'dueAt');
    this.assertSourceReference(dto);
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      dto.petId,
      'Pet not found',
    );
    if (dto.sourceType !== undefined && dto.sourceId !== undefined) {
      await this.assertSourceBelongsToPet(
        dto.sourceType,
        dto.sourceId,
        dto.petId,
      );
    }

    try {
      const created = await this.reminderModel.create({
        petId: new Types.ObjectId(dto.petId),
        type: dto.type,
        title: dto.title,
        message: dto.message,
        dueAt: dto.dueAt,
        status: ReminderStatus.PENDING,
        ...(dto.sourceType !== undefined && {
          sourceType: dto.sourceType,
          sourceId: new Types.ObjectId(dto.sourceId),
        }),
      });

      return this.toReminderModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create reminder');
    }
  }

  async findRemindersForPet(
    ownerId: string,
    petId: string,
  ): Promise<ReminderModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      petId,
      'Pet not found',
    );

    const reminders = await this.reminderModel
      .find({ petId: new Types.ObjectId(petId) })
      .sort({ dueAt: 1 })
      .exec();

    return reminders.map((reminder) => this.toReminderModel(reminder));
  }

  async findReminderByIdForOwner(
    ownerId: string,
    reminderId: string,
  ): Promise<ReminderModel> {
    const reminder = await this.findOwnedReminderDocument(ownerId, reminderId);
    return this.toReminderModel(reminder);
  }

  async updateReminder(
    ownerId: string,
    reminderId: string,
    input: UpdateReminderInput,
  ): Promise<ReminderModel> {
    this.assertImmutableFieldsNotChanged(input);
    const dto = await this.validateUpdateInput(input);
    const reminder = await this.findOwnedReminderDocument(ownerId, reminderId);
    this.assertOwnerManaged(reminder);

    if (dto.type !== undefined) {
      reminder.type = dto.type;
    }
    if (dto.title !== undefined) {
      reminder.title = dto.title;
    }
    if (dto.message !== undefined) {
      reminder.message = dto.message;
    }
    if (dto.dueAt !== undefined) {
      this.assertValidDate(dto.dueAt, 'dueAt');
      reminder.dueAt = dto.dueAt;
    }

    try {
      await reminder.save();
      return this.toReminderModel(reminder);
    } catch {
      throw new InternalServerErrorException('Failed to update reminder');
    }
  }

  async completeReminder(
    ownerId: string,
    reminderId: string,
  ): Promise<ReminderModel> {
    const reminder = await this.findOwnedReminderDocument(ownerId, reminderId);
    this.assertPendingStatus(reminder, 'complete');

    reminder.status = ReminderStatus.COMPLETED;
    await reminder.save();
    return this.toReminderModel(reminder);
  }

  async dismissReminder(
    ownerId: string,
    reminderId: string,
  ): Promise<ReminderModel> {
    const reminder = await this.findOwnedReminderDocument(ownerId, reminderId);
    this.assertPendingStatus(reminder, 'dismiss');

    reminder.status = ReminderStatus.DISMISSED;
    await reminder.save();
    return this.toReminderModel(reminder);
  }

  async deleteReminder(ownerId: string, reminderId: string): Promise<boolean> {
    const reminder = await this.findOwnedReminderDocument(ownerId, reminderId);
    this.assertOwnerManaged(reminder);
    await reminder.deleteOne();
    return true;
  }

  /**
   * Reminders a clinic may see for a patient: the ones clinics set and the
   * automatic ones from clinic records — never the owner's personal ones.
   */
  async findClinicVisibleForPet(petId: string): Promise<ReminderModel[]> {
    if (!isValidObjectId(petId)) {
      throw new NotFoundException('Pet not found');
    }
    const reminders = await this.reminderModel
      .find({
        petId: new Types.ObjectId(petId),
        $or: [{ clinicId: { $exists: true, $ne: null } }, { automatic: true }],
      })
      .sort({ dueAt: 1 })
      .exec();
    return reminders.map((reminder) => this.toReminderModel(reminder));
  }

  async createForClinic(input: ClinicReminderInput): Promise<ReminderModel> {
    this.assertValidDate(input.dueAt, 'dueAt');
    await this.assertActivePet(input.petId);
    const created = await this.reminderModel.create({
      petId: new Types.ObjectId(input.petId),
      type: input.type,
      title: input.title,
      message: input.message,
      dueAt: input.dueAt,
      status: ReminderStatus.PENDING,
      clinicId: input.clinicId,
      clinicName: input.clinicName,
      createdByName: input.createdByName,
    });
    return this.toReminderModel(created);
  }

  /** Removes a reminder the given clinic set; returns what was removed. */
  async deleteForClinic(
    reminderId: string,
    clinicId: string,
    petId: string,
  ): Promise<ReminderModel> {
    if (!isValidObjectId(reminderId)) {
      throw new NotFoundException('Reminder not found');
    }
    const reminder = await this.reminderModel.findById(reminderId).exec();
    if (!reminder || reminder.petId.toString() !== petId) {
      throw new NotFoundException('Reminder not found');
    }
    if (reminder.clinicId !== clinicId) {
      throw new ForbiddenException(OTHER_CLINIC_REMINDER_MESSAGE);
    }
    const model = this.toReminderModel(reminder);
    await reminder.deleteOne();
    return model;
  }

  private assertOwnerManaged(reminder: ReminderDocument): void {
    if (reminderManagedBy(reminder) !== ReminderManagedBy.OWNER) {
      throw new ForbiddenException(MANAGED_REMINDER_MESSAGE);
    }
  }

  private async assertActivePet(petId: string): Promise<void> {
    if (!isValidObjectId(petId)) {
      throw new NotFoundException('Pet not found');
    }
    const exists = await this.petModel
      .exists({ _id: new Types.ObjectId(petId), deletedAt: null })
      .exec();
    if (!exists) {
      throw new NotFoundException('Pet not found');
    }
  }

  private async findOwnedReminderDocument(
    ownerId: string,
    reminderId: string,
  ): Promise<ReminderDocument> {
    if (!isValidObjectId(reminderId)) {
      throw new NotFoundException('Reminder not found');
    }

    const reminder = await this.reminderModel.findById(reminderId).exec();
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      reminder.petId.toString(),
      'Reminder not found',
    );

    return reminder;
  }

  private assertPendingStatus(
    reminder: ReminderDocument,
    action: 'complete' | 'dismiss',
  ): void {
    if (reminder.status !== ReminderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot ${action} a reminder that is not pending`,
      );
    }
  }

  private assertSourceReference(dto: CreateReminderInput): void {
    const hasSourceType = dto.sourceType !== undefined;
    const hasSourceId = dto.sourceId !== undefined;

    if (hasSourceType !== hasSourceId) {
      throw new BadRequestException(
        'sourceType and sourceId must be provided together',
      );
    }
  }

  /** The linked record must exist and belong to the same pet as the reminder. */
  private async assertSourceBelongsToPet(
    sourceType: SourceType,
    sourceId: string,
    petId: string,
  ): Promise<void> {
    const filter = {
      _id: new Types.ObjectId(sourceId),
      petId: new Types.ObjectId(petId),
    };

    let exists: unknown;
    switch (sourceType) {
      case SourceType.VACCINATION:
        exists = await this.vaccinationModel.exists(filter).exec();
        break;
      case SourceType.MEDICATION:
        exists = await this.medicationModel.exists(filter).exec();
        break;
      case SourceType.APPOINTMENT:
        exists = await this.appointmentModel.exists(filter).exec();
        break;
    }

    if (!exists) {
      throw new BadRequestException('Linked record not found for this pet');
    }
  }

  private assertImmutableFieldsNotChanged(input: UpdateReminderInput): void {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }
    if (
      Object.prototype.hasOwnProperty.call(input, 'sourceType') ||
      Object.prototype.hasOwnProperty.call(input, 'sourceId')
    ) {
      throw new BadRequestException(
        'sourceType and sourceId cannot be changed',
      );
    }
  }

  private assertValidDate(value: Date, fieldName: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
  }

  private async validateCreateInput(
    input: CreateReminderInput,
  ): Promise<CreateReminderInput> {
    const dto = plainToInstance(CreateReminderInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateUpdateInput(
    input: UpdateReminderInput,
  ): Promise<UpdateReminderInput> {
    const dto = plainToInstance(UpdateReminderInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (
      dto.type === undefined &&
      dto.title === undefined &&
      dto.message === undefined &&
      dto.dueAt === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    return dto;
  }

  private toReminderModel(document: ReminderDocument): ReminderModel {
    return {
      id: document._id.toString(),
      petId: document.petId.toString(),
      type: document.type,
      title: document.title,
      message: document.message,
      dueAt: document.dueAt,
      status: document.status,
      sourceType: document.sourceType,
      sourceId: document.sourceId?.toString(),
      managedBy: reminderManagedBy(document),
      clinicId: document.clinicId,
      clinicName: document.clinicName,
      createdByName: document.createdByName,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
