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
import { ACTIVE_PET_FILTER } from '../pets/constants/active-pet-filter';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { CreateAppointmentInput } from './dto/create-appointment.input';
import { UpdateAppointmentInput } from './dto/update-appointment.input';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { AppointmentModel } from './models/appointment.model';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
    private readonly petOwnershipService: PetOwnershipService,
  ) {}

  async createAppointment(
    ownerId: string,
    input: CreateAppointmentInput,
  ): Promise<AppointmentModel> {
    const dto = await this.validateCreateInput(input);
    this.assertValidDate(dto.scheduledAt, 'scheduledAt');
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      dto.petId,
      'Pet not found',
    );

    const status = dto.status ?? AppointmentStatus.SCHEDULED;

    try {
      const created = await this.appointmentModel.create({
        petId: new Types.ObjectId(dto.petId),
        scheduledAt: dto.scheduledAt,
        type: dto.type,
        clinicName: dto.clinicName,
        veterinarianName: dto.veterinarianName,
        reason: dto.reason,
        notes: dto.notes,
        status,
      });

      return this.toAppointmentModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create appointment');
    }
  }

  async findAppointmentsForPet(
    ownerId: string,
    petId: string,
  ): Promise<AppointmentModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      petId,
      'Pet not found',
    );

    const appointments = await this.appointmentModel
      .find({ petId: new Types.ObjectId(petId) })
      .sort({ scheduledAt: 1 })
      .exec();

    return appointments.map((appointment) =>
      this.toAppointmentModel(appointment),
    );
  }

  async findAppointmentByIdForOwner(
    ownerId: string,
    appointmentId: string,
  ): Promise<AppointmentModel> {
    const appointment = await this.findOwnedAppointmentDocument(
      ownerId,
      appointmentId,
    );
    return this.toAppointmentModel(appointment);
  }

  async updateAppointment(
    ownerId: string,
    appointmentId: string,
    input: UpdateAppointmentInput,
  ): Promise<AppointmentModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const appointment = await this.findOwnedAppointmentDocument(
      ownerId,
      appointmentId,
    );
    const originalPetId = appointment.petId.toString();

    if (dto.scheduledAt !== undefined) {
      this.assertValidDate(dto.scheduledAt, 'scheduledAt');
      appointment.scheduledAt = dto.scheduledAt;
    }
    if (dto.type !== undefined) {
      appointment.type = dto.type;
    }
    if (dto.clinicName !== undefined) {
      appointment.clinicName = dto.clinicName;
    }
    if (dto.veterinarianName !== undefined) {
      appointment.veterinarianName = dto.veterinarianName;
    }
    if (dto.reason !== undefined) {
      appointment.reason = dto.reason;
    }
    if (dto.notes !== undefined) {
      appointment.notes = dto.notes;
    }
    if (dto.status !== undefined) {
      appointment.status = dto.status;
    }

    try {
      await appointment.save();
      if (appointment.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toAppointmentModel(appointment);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update appointment');
    }
  }

  async findAppointmentsByPetIds(
    petIds: string[],
    options: { scheduledFrom?: Date; scheduledTo?: Date } = {},
  ): Promise<AppointmentModel[]> {
    const objectIds = petIds
      .filter((id) => isValidObjectId(id))
      .map((id) => new Types.ObjectId(id));
    if (!objectIds.length) {
      return [];
    }

    const filter: Record<string, unknown> = {
      petId: { $in: objectIds },
    };
    if (options.scheduledFrom || options.scheduledTo) {
      filter.scheduledAt = {};
      if (options.scheduledFrom) {
        (filter.scheduledAt as Record<string, Date>).$gte =
          options.scheduledFrom;
      }
      if (options.scheduledTo) {
        (filter.scheduledAt as Record<string, Date>).$lte = options.scheduledTo;
      }
    }

    const appointments = await this.appointmentModel
      .find(filter)
      .sort({ scheduledAt: 1 })
      .exec();

    return appointments.map((appointment) =>
      this.toAppointmentModel(appointment),
    );
  }

  async findAppointmentById(appointmentId: string): Promise<AppointmentModel> {
    const appointment = await this.findAppointmentDocumentById(appointmentId);
    return this.toAppointmentModel(appointment);
  }

  async createAppointmentForService(
    petId: string,
    input: CreateAppointmentInput & { vetClinicId?: string },
  ): Promise<AppointmentModel> {
    const dto = await this.validateCreateInput(input);
    this.assertValidDate(dto.scheduledAt, 'scheduledAt');
    await this.assertActivePetExists(petId);

    const status = dto.status ?? AppointmentStatus.SCHEDULED;

    try {
      const created = await this.appointmentModel.create({
        petId: new Types.ObjectId(petId),
        scheduledAt: dto.scheduledAt,
        type: dto.type,
        vetClinicId: input.vetClinicId?.trim() || undefined,
        clinicName: dto.clinicName,
        veterinarianName: dto.veterinarianName,
        reason: dto.reason,
        notes: dto.notes,
        status,
      });

      return this.toAppointmentModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create appointment');
    }
  }

  async updateAppointmentForService(
    appointmentId: string,
    input: UpdateAppointmentInput,
  ): Promise<AppointmentModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const appointment = await this.findAppointmentDocumentById(appointmentId);
    const originalPetId = appointment.petId.toString();

    if (dto.scheduledAt !== undefined) {
      this.assertValidDate(dto.scheduledAt, 'scheduledAt');
      appointment.scheduledAt = dto.scheduledAt;
    }
    if (dto.type !== undefined) {
      appointment.type = dto.type;
    }
    if (dto.clinicName !== undefined) {
      appointment.clinicName = dto.clinicName;
    }
    if (dto.veterinarianName !== undefined) {
      appointment.veterinarianName = dto.veterinarianName;
    }
    if (dto.reason !== undefined) {
      appointment.reason = dto.reason;
    }
    if (dto.notes !== undefined) {
      appointment.notes = dto.notes;
    }
    if (dto.status !== undefined) {
      appointment.status = dto.status;
    }

    try {
      await appointment.save();
      if (appointment.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toAppointmentModel(appointment);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update appointment');
    }
  }

  async deleteAppointment(
    ownerId: string,
    appointmentId: string,
  ): Promise<boolean> {
    const appointment = await this.findOwnedAppointmentDocument(
      ownerId,
      appointmentId,
    );
    await appointment.deleteOne();
    return true;
  }

  private async assertActivePetExists(petId: string): Promise<void> {
    if (!isValidObjectId(petId)) {
      throw new NotFoundException('Pet not found');
    }

    const pet = await this.petModel
      .findOne({
        _id: new Types.ObjectId(petId),
        ...ACTIVE_PET_FILTER,
      })
      .exec();
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }
  }

  private async findAppointmentDocumentById(
    appointmentId: string,
  ): Promise<AppointmentDocument> {
    if (!isValidObjectId(appointmentId)) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .exec();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  private async findOwnedAppointmentDocument(
    ownerId: string,
    appointmentId: string,
  ): Promise<AppointmentDocument> {
    if (!isValidObjectId(appointmentId)) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .exec();
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      appointment.petId.toString(),
      'Appointment not found',
    );

    return appointment;
  }

  private assertValidDate(value: Date, fieldName: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
  }

  private async validateCreateInput(
    input: CreateAppointmentInput,
  ): Promise<CreateAppointmentInput> {
    const dto = plainToInstance(CreateAppointmentInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateUpdateInput(
    input: UpdateAppointmentInput,
  ): Promise<UpdateAppointmentInput> {
    const dto = plainToInstance(UpdateAppointmentInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (
      dto.scheduledAt === undefined &&
      dto.type === undefined &&
      dto.clinicName === undefined &&
      dto.veterinarianName === undefined &&
      dto.reason === undefined &&
      dto.notes === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    return dto;
  }

  private toAppointmentModel(document: AppointmentDocument): AppointmentModel {
    return {
      id: document._id.toString(),
      petId: document.petId.toString(),
      scheduledAt: document.scheduledAt,
      type: document.type,
      vetClinicId: document.vetClinicId,
      clinicName: document.clinicName,
      veterinarianName: document.veterinarianName,
      reason: document.reason,
      notes: document.notes,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
