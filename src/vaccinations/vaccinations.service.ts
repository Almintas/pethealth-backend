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
import { CreateVaccinationInput } from './dto/create-vaccination.input';
import { UpdateVaccinationInput } from './dto/update-vaccination.input';
import { VaccinationModel } from './models/vaccination.model';
import { Vaccination, VaccinationDocument } from './schemas/vaccination.schema';
import {
  VaccinationsPageQuery,
  VaccinationsPageResult,
} from './types/vaccinations-page.types';

const VACCINATIONS_MAX_PAGE_SIZE = 100;

@Injectable()
export class VaccinationsService {
  constructor(
    @InjectModel(Vaccination.name)
    private readonly vaccinationModel: Model<VaccinationDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
    private readonly petOwnershipService: PetOwnershipService,
  ) {}

  async createVaccination(
    ownerId: string,
    input: CreateVaccinationInput,
  ): Promise<VaccinationModel> {
    const dto = await this.validateCreateInput(input);
    this.assertDueDateNotBeforeAdministered(dto.administeredAt, dto.nextDueAt);
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      dto.petId,
      'Pet not found',
    );

    try {
      const created = await this.vaccinationModel.create({
        petId: new Types.ObjectId(dto.petId),
        vaccineName: dto.vaccineName,
        administeredAt: dto.administeredAt,
        nextDueAt: dto.nextDueAt,
        veterinarianName: dto.veterinarianName,
        clinicName: dto.clinicName,
        batchNumber: dto.batchNumber,
        notes: dto.notes,
      });

      return this.toVaccinationModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create vaccination');
    }
  }

  async findVaccinationsForPet(
    ownerId: string,
    petId: string,
  ): Promise<VaccinationModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      petId,
      'Pet not found',
    );

    const vaccinations = await this.vaccinationModel
      .find({ petId: new Types.ObjectId(petId) })
      .sort({ administeredAt: -1 })
      .exec();

    return vaccinations.map((vaccination) =>
      this.toVaccinationModel(vaccination),
    );
  }

  async findVaccinationByIdForOwner(
    ownerId: string,
    vaccinationId: string,
  ): Promise<VaccinationModel> {
    const vaccination = await this.findOwnedVaccinationDocument(
      ownerId,
      vaccinationId,
    );
    return this.toVaccinationModel(vaccination);
  }

  async updateVaccination(
    ownerId: string,
    vaccinationId: string,
    input: UpdateVaccinationInput,
  ): Promise<VaccinationModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const vaccination = await this.findOwnedVaccinationDocument(
      ownerId,
      vaccinationId,
    );
    const originalPetId = vaccination.petId.toString();

    const administeredAt = dto.administeredAt ?? vaccination.administeredAt;
    const nextDueAt =
      dto.nextDueAt !== undefined ? dto.nextDueAt : vaccination.nextDueAt;
    this.assertDueDateNotBeforeAdministered(administeredAt, nextDueAt);

    if (dto.vaccineName !== undefined) {
      vaccination.vaccineName = dto.vaccineName;
    }
    if (dto.administeredAt !== undefined) {
      vaccination.administeredAt = dto.administeredAt;
    }
    if (dto.nextDueAt !== undefined) {
      vaccination.nextDueAt = dto.nextDueAt;
    }
    if (dto.veterinarianName !== undefined) {
      vaccination.veterinarianName = dto.veterinarianName;
    }
    if (dto.clinicName !== undefined) {
      vaccination.clinicName = dto.clinicName;
    }
    if (dto.batchNumber !== undefined) {
      vaccination.batchNumber = dto.batchNumber;
    }
    if (dto.notes !== undefined) {
      vaccination.notes = dto.notes;
    }

    try {
      await vaccination.save();
      if (vaccination.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toVaccinationModel(vaccination);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update vaccination');
    }
  }

  async deleteVaccination(
    ownerId: string,
    vaccinationId: string,
  ): Promise<boolean> {
    const vaccination = await this.findOwnedVaccinationDocument(
      ownerId,
      vaccinationId,
    );
    await vaccination.deleteOne();
    return true;
  }

  async findVaccinationsPageForService(
    petId: string,
    query: VaccinationsPageQuery,
  ): Promise<VaccinationsPageResult> {
    await this.assertActivePetExists(petId);

    const page = Math.max(1, Math.floor(query.page) || 1);
    const limit = Math.min(
      VACCINATIONS_MAX_PAGE_SIZE,
      Math.max(1, Math.floor(query.limit) || 20),
    );
    const filter = this.buildVaccinationsFilter(petId, query);
    const petObjectId = new Types.ObjectId(petId);

    const total = await this.vaccinationModel.countDocuments(filter).exec();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage =
      totalPages === 0 ? 1 : Math.min(page, Math.max(1, totalPages));
    const skip = (safePage - 1) * limit;

    const vaccinations = await this.vaccinationModel
      .find(filter)
      .sort({ administeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const now = new Date();
    const upcoming = await this.vaccinationModel
      .findOne({
        petId: petObjectId,
        nextDueAt: { $gte: now },
      })
      .sort({ nextDueAt: 1 })
      .exec();

    return {
      items: vaccinations.map((vaccination) =>
        this.toVaccinationModel(vaccination),
      ),
      total,
      page: safePage,
      limit,
      totalPages,
      nextDueVaccineName: upcoming?.vaccineName,
      nextDueAt: upcoming?.nextDueAt,
    };
  }

  async findVaccinationByIdForService(
    vaccinationId: string,
  ): Promise<VaccinationModel> {
    const vaccination = await this.findVaccinationDocumentById(vaccinationId);
    return this.toVaccinationModel(vaccination);
  }

  async createVaccinationForService(
    petId: string,
    input: Omit<CreateVaccinationInput, 'petId'>,
  ): Promise<VaccinationModel> {
    const dto = await this.validateCreateInput({
      ...input,
      petId,
    });
    this.assertDueDateNotBeforeAdministered(dto.administeredAt, dto.nextDueAt);
    await this.assertActivePetExists(petId);

    try {
      const created = await this.vaccinationModel.create({
        petId: new Types.ObjectId(petId),
        vaccineName: dto.vaccineName,
        administeredAt: dto.administeredAt,
        nextDueAt: dto.nextDueAt,
        veterinarianName: dto.veterinarianName,
        clinicName: dto.clinicName,
        batchNumber: dto.batchNumber,
        notes: dto.notes,
      });

      return this.toVaccinationModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create vaccination');
    }
  }

  async updateVaccinationForService(
    vaccinationId: string,
    input: UpdateVaccinationInput,
  ): Promise<VaccinationModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const vaccination = await this.findVaccinationDocumentById(vaccinationId);
    const originalPetId = vaccination.petId.toString();

    const administeredAt = dto.administeredAt ?? vaccination.administeredAt;
    const nextDueAt =
      dto.nextDueAt !== undefined ? dto.nextDueAt : vaccination.nextDueAt;
    this.assertDueDateNotBeforeAdministered(administeredAt, nextDueAt);

    if (dto.vaccineName !== undefined) {
      vaccination.vaccineName = dto.vaccineName;
    }
    if (dto.administeredAt !== undefined) {
      vaccination.administeredAt = dto.administeredAt;
    }
    if (dto.nextDueAt !== undefined) {
      vaccination.nextDueAt = dto.nextDueAt;
    }
    if (dto.veterinarianName !== undefined) {
      vaccination.veterinarianName = dto.veterinarianName;
    }
    if (dto.clinicName !== undefined) {
      vaccination.clinicName = dto.clinicName;
    }
    if (dto.batchNumber !== undefined) {
      vaccination.batchNumber = dto.batchNumber;
    }
    if (dto.notes !== undefined) {
      vaccination.notes = dto.notes;
    }

    try {
      await vaccination.save();
      if (vaccination.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toVaccinationModel(vaccination);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update vaccination');
    }
  }

  private buildVaccinationsFilter(
    petId: string,
    query: VaccinationsPageQuery,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      petId: new Types.ObjectId(petId),
    };

    const search = query.search?.trim();
    if (search) {
      const pattern = new RegExp(this.escapeRegex(search), 'i');
      filter.$or = [
        { vaccineName: pattern },
        { batchNumber: pattern },
        { notes: pattern },
      ];
    }

    const vaccineName = query.vaccineName?.trim();
    if (vaccineName) {
      filter.vaccineName = new RegExp(this.escapeRegex(vaccineName), 'i');
    }

    if (query.administeredFrom || query.administeredTo) {
      const administeredAt: Record<string, Date> = {};
      if (query.administeredFrom) {
        administeredAt.$gte = query.administeredFrom;
      }
      if (query.administeredTo) {
        administeredAt.$lte = query.administeredTo;
      }
      filter.administeredAt = administeredAt;
    }

    if (query.upcomingOnly) {
      filter.nextDueAt = { $gte: new Date() };
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  private async findVaccinationDocumentById(
    vaccinationId: string,
  ): Promise<VaccinationDocument> {
    if (!isValidObjectId(vaccinationId)) {
      throw new NotFoundException('Vaccination not found');
    }

    const vaccination = await this.vaccinationModel
      .findById(vaccinationId)
      .exec();
    if (!vaccination) {
      throw new NotFoundException('Vaccination not found');
    }

    return vaccination;
  }

  private async findOwnedVaccinationDocument(
    ownerId: string,
    vaccinationId: string,
  ): Promise<VaccinationDocument> {
    if (!isValidObjectId(vaccinationId)) {
      throw new NotFoundException('Vaccination not found');
    }

    const vaccination = await this.vaccinationModel
      .findById(vaccinationId)
      .exec();
    if (!vaccination) {
      throw new NotFoundException('Vaccination not found');
    }

    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      vaccination.petId.toString(),
      'Vaccination not found',
    );

    return vaccination;
  }

  private assertDueDateNotBeforeAdministered(
    administeredAt: Date,
    nextDueAt?: Date,
  ): void {
    if (nextDueAt && nextDueAt.getTime() < administeredAt.getTime()) {
      throw new BadRequestException(
        'nextDueAt cannot be earlier than administeredAt',
      );
    }
  }

  private async validateCreateInput(
    input: CreateVaccinationInput,
  ): Promise<CreateVaccinationInput> {
    const dto = plainToInstance(CreateVaccinationInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateUpdateInput(
    input: UpdateVaccinationInput,
  ): Promise<UpdateVaccinationInput> {
    const dto = plainToInstance(UpdateVaccinationInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (
      dto.vaccineName === undefined &&
      dto.administeredAt === undefined &&
      dto.nextDueAt === undefined &&
      dto.veterinarianName === undefined &&
      dto.clinicName === undefined &&
      dto.batchNumber === undefined &&
      dto.notes === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    return dto;
  }

  private toVaccinationModel(document: VaccinationDocument): VaccinationModel {
    return {
      id: document._id.toString(),
      petId: document.petId.toString(),
      vaccineName: document.vaccineName,
      administeredAt: document.administeredAt,
      nextDueAt: document.nextDueAt,
      veterinarianName: document.veterinarianName,
      clinicName: document.clinicName,
      batchNumber: document.batchNumber,
      notes: document.notes,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
