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
import { CreateMedicalRecordInput } from './dto/create-medical-record.input';
import { UpdateMedicalRecordInput } from './dto/update-medical-record.input';
import { MedicalRecordModel } from './models/medical-record.model';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from './schemas/medical-record.schema';
import {
  MedicalRecordsPageQuery,
  MedicalRecordsPageResult,
} from './types/medical-records-page.types';

const MEDICAL_RECORDS_MAX_PAGE_SIZE = 100;

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecordDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
    private readonly petOwnershipService: PetOwnershipService,
  ) {}

  async createMedicalRecord(
    ownerId: string,
    input: CreateMedicalRecordInput,
  ): Promise<MedicalRecordModel> {
    const dto = await this.validateCreateInput(input);
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      dto.petId,
      'Pet not found',
    );

    try {
      const created = await this.medicalRecordModel.create({
        petId: new Types.ObjectId(dto.petId),
        date: dto.date,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        diagnosis: dto.diagnosis,
        veterinarianName: dto.veterinarianName,
        clinicName: dto.clinicName,
        notes: dto.notes,
      });

      return this.toMedicalRecordModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create medical record');
    }
  }

  async findMedicalRecordsForPet(
    ownerId: string,
    petId: string,
  ): Promise<MedicalRecordModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      petId,
      'Pet not found',
    );

    const records = await this.medicalRecordModel
      .find({ petId: new Types.ObjectId(petId) })
      .sort({ date: -1 })
      .exec();

    return records.map((record) => this.toMedicalRecordModel(record));
  }

  async findMedicalRecordByIdForOwner(
    ownerId: string,
    recordId: string,
  ): Promise<MedicalRecordModel> {
    const record = await this.findOwnedMedicalRecordDocument(ownerId, recordId);
    return this.toMedicalRecordModel(record);
  }

  async updateMedicalRecord(
    ownerId: string,
    recordId: string,
    input: UpdateMedicalRecordInput,
  ): Promise<MedicalRecordModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const record = await this.findOwnedMedicalRecordDocument(ownerId, recordId);
    const originalPetId = record.petId.toString();

    if (dto.date !== undefined) {
      record.date = dto.date;
    }
    if (dto.type !== undefined) {
      record.type = dto.type;
    }
    if (dto.title !== undefined) {
      record.title = dto.title;
    }
    if (dto.description !== undefined) {
      record.description = dto.description;
    }
    if (dto.diagnosis !== undefined) {
      record.diagnosis = dto.diagnosis;
    }
    if (dto.veterinarianName !== undefined) {
      record.veterinarianName = dto.veterinarianName;
    }
    if (dto.clinicName !== undefined) {
      record.clinicName = dto.clinicName;
    }
    if (dto.notes !== undefined) {
      record.notes = dto.notes;
    }

    try {
      await record.save();
      if (record.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toMedicalRecordModel(record);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update medical record');
    }
  }

  async deleteMedicalRecord(
    ownerId: string,
    recordId: string,
  ): Promise<boolean> {
    const record = await this.findOwnedMedicalRecordDocument(ownerId, recordId);
    await record.deleteOne();
    return true;
  }

  async findMedicalRecordsPageForService(
    petId: string,
    query: MedicalRecordsPageQuery,
  ): Promise<MedicalRecordsPageResult> {
    await this.assertActivePetExists(petId);

    const page = Math.max(1, Math.floor(query.page) || 1);
    const limit = Math.min(
      MEDICAL_RECORDS_MAX_PAGE_SIZE,
      Math.max(1, Math.floor(query.limit) || 20),
    );
    const filter = this.buildMedicalRecordsFilter(petId, query);

    const total = await this.medicalRecordModel.countDocuments(filter).exec();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const safePage =
      totalPages === 0 ? 1 : Math.min(page, Math.max(1, totalPages));
    const skip = (safePage - 1) * limit;

    const records = await this.medicalRecordModel
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items: records.map((record) => this.toMedicalRecordModel(record)),
      total,
      page: safePage,
      limit,
      totalPages,
    };
  }

  async findMedicalRecordsForPetForService(
    petId: string,
  ): Promise<MedicalRecordModel[]> {
    await this.assertActivePetExists(petId);

    const records = await this.medicalRecordModel
      .find({ petId: new Types.ObjectId(petId) })
      .sort({ date: -1 })
      .exec();

    return records.map((record) => this.toMedicalRecordModel(record));
  }

  async findMedicalRecordsByPetIdsForService(
    petIds: string[],
  ): Promise<MedicalRecordModel[]> {
    const uniqueIds = [
      ...new Set(petIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (!uniqueIds.length) {
      return [];
    }

    await this.assertActivePetsExist(uniqueIds);

    const records = await this.medicalRecordModel
      .find({
        petId: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      })
      .sort({ date: -1 })
      .exec();

    return records.map((record) => this.toMedicalRecordModel(record));
  }

  async findMedicalRecordByIdForService(
    recordId: string,
  ): Promise<MedicalRecordModel> {
    const record = await this.findMedicalRecordDocumentById(recordId);
    return this.toMedicalRecordModel(record);
  }

  async createMedicalRecordForService(
    petId: string,
    input: Omit<CreateMedicalRecordInput, 'petId'>,
  ): Promise<MedicalRecordModel> {
    const dto = await this.validateCreateInput({
      ...input,
      petId,
    });
    await this.assertActivePetExists(petId);

    try {
      const created = await this.medicalRecordModel.create({
        petId: new Types.ObjectId(petId),
        date: dto.date,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        diagnosis: dto.diagnosis,
        veterinarianName: dto.veterinarianName,
        clinicName: dto.clinicName,
        notes: dto.notes,
      });

      return this.toMedicalRecordModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create medical record');
    }
  }

  async updateMedicalRecordForService(
    recordId: string,
    input: UpdateMedicalRecordInput,
  ): Promise<MedicalRecordModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const record = await this.findMedicalRecordDocumentById(recordId);
    const originalPetId = record.petId.toString();

    if (dto.date !== undefined) {
      record.date = dto.date;
    }
    if (dto.type !== undefined) {
      record.type = dto.type;
    }
    if (dto.title !== undefined) {
      record.title = dto.title;
    }
    if (dto.description !== undefined) {
      record.description = dto.description;
    }
    if (dto.diagnosis !== undefined) {
      record.diagnosis = dto.diagnosis;
    }
    if (dto.veterinarianName !== undefined) {
      record.veterinarianName = dto.veterinarianName;
    }
    if (dto.clinicName !== undefined) {
      record.clinicName = dto.clinicName;
    }
    if (dto.notes !== undefined) {
      record.notes = dto.notes;
    }

    try {
      await record.save();
      if (record.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toMedicalRecordModel(record);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update medical record');
    }
  }

  private buildMedicalRecordsFilter(
    petId: string,
    query: MedicalRecordsPageQuery,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      petId: new Types.ObjectId(petId),
    };

    const type = query.type?.trim();
    if (type) {
      filter.type = type;
    }

    if (query.dateFrom || query.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (query.dateFrom) {
        dateFilter.$gte = query.dateFrom;
      }
      if (query.dateTo) {
        dateFilter.$lte = query.dateTo;
      }
      filter.date = dateFilter;
    }

    const search = query.search?.trim();
    if (search) {
      const pattern = new RegExp(this.escapeRegex(search), 'i');
      filter.$or = [
        { title: pattern },
        { description: pattern },
        { diagnosis: pattern },
        { notes: pattern },
        { type: pattern },
      ];
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async assertActivePetExists(petId: string): Promise<void> {
    await this.assertActivePetsExist([petId]);
  }

  private async assertActivePetsExist(petIds: string[]): Promise<void> {
    const uniqueIds = [
      ...new Set(petIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (!uniqueIds.length) {
      return;
    }

    for (const petId of uniqueIds) {
      if (!isValidObjectId(petId)) {
        throw new NotFoundException('Pet not found');
      }
    }

    const activeCount = await this.petModel
      .countDocuments({
        _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
        ...ACTIVE_PET_FILTER,
      })
      .exec();

    if (activeCount !== uniqueIds.length) {
      throw new NotFoundException('Pet not found');
    }
  }

  private async findMedicalRecordDocumentById(
    recordId: string,
  ): Promise<MedicalRecordDocument> {
    if (!isValidObjectId(recordId)) {
      throw new NotFoundException('Medical record not found');
    }

    const record = await this.medicalRecordModel.findById(recordId).exec();
    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    return record;
  }

  private async findOwnedMedicalRecordDocument(
    ownerId: string,
    recordId: string,
  ): Promise<MedicalRecordDocument> {
    if (!isValidObjectId(recordId)) {
      throw new NotFoundException('Medical record not found');
    }

    const record = await this.medicalRecordModel.findById(recordId).exec();
    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      record.petId.toString(),
      'Medical record not found',
    );

    return record;
  }

  private async validateCreateInput(
    input: CreateMedicalRecordInput,
  ): Promise<CreateMedicalRecordInput> {
    const dto = plainToInstance(CreateMedicalRecordInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateUpdateInput(
    input: UpdateMedicalRecordInput,
  ): Promise<UpdateMedicalRecordInput> {
    const dto = plainToInstance(UpdateMedicalRecordInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (
      dto.date === undefined &&
      dto.type === undefined &&
      dto.title === undefined &&
      dto.description === undefined &&
      dto.diagnosis === undefined &&
      dto.veterinarianName === undefined &&
      dto.clinicName === undefined &&
      dto.notes === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    return dto;
  }

  private toMedicalRecordModel(
    document: MedicalRecordDocument,
  ): MedicalRecordModel {
    return {
      id: document._id.toString(),
      petId: document.petId.toString(),
      date: document.date,
      type: document.type,
      title: document.title,
      description: document.description,
      diagnosis: document.diagnosis,
      veterinarianName: document.veterinarianName,
      clinicName: document.clinicName,
      notes: document.notes,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
