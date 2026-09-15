import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types, isValidObjectId } from 'mongoose';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { CreateReminderInput } from './dto/create-reminder.input';
import { UpdateReminderInput } from './dto/update-reminder.input';
import { ReminderStatus } from './enums/reminder-status.enum';
import { ReminderModel } from './models/reminder.model';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    private readonly petOwnershipService: PetOwnershipService,
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
    await reminder.deleteOne();
    return true;
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
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
