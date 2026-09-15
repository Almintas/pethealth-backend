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
import { CreateMedicationInput } from './dto/create-medication.input';
import { UpdateMedicationInput } from './dto/update-medication.input';
import { MedicationModel } from './models/medication.model';
import { Medication, MedicationDocument } from './schemas/medication.schema';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<MedicationDocument>,
    private readonly petOwnershipService: PetOwnershipService,
  ) {}

  async createMedication(
    ownerId: string,
    input: CreateMedicationInput,
  ): Promise<MedicationModel> {
    const dto = await this.validateCreateInput(input);
    this.assertEndDateNotBeforeStartDate(dto.startDate, dto.endDate);
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      dto.petId,
      'Pet not found',
    );

    const isActive = dto.isActive ?? true;

    try {
      const created = await this.medicationModel.create({
        petId: new Types.ObjectId(dto.petId),
        name: dto.name,
        dosage: dto.dosage,
        dosageUnit: dto.dosageUnit,
        frequency: dto.frequency,
        startDate: dto.startDate,
        endDate: dto.endDate,
        veterinarianName: dto.veterinarianName,
        clinicName: dto.clinicName,
        notes: dto.notes,
        isActive,
      });

      return this.toMedicationModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create medication');
    }
  }

  async findMedicationsForPet(
    ownerId: string,
    petId: string,
  ): Promise<MedicationModel[]> {
    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      petId,
      'Pet not found',
    );

    const medications = await this.medicationModel
      .find({ petId: new Types.ObjectId(petId) })
      .sort({ startDate: -1 })
      .exec();

    return medications.map((medication) => this.toMedicationModel(medication));
  }

  async findMedicationByIdForOwner(
    ownerId: string,
    medicationId: string,
  ): Promise<MedicationModel> {
    const medication = await this.findOwnedMedicationDocument(
      ownerId,
      medicationId,
    );
    return this.toMedicationModel(medication);
  }

  async updateMedication(
    ownerId: string,
    medicationId: string,
    input: UpdateMedicationInput,
  ): Promise<MedicationModel> {
    if (Object.prototype.hasOwnProperty.call(input, 'petId')) {
      throw new BadRequestException('petId cannot be changed');
    }

    const dto = await this.validateUpdateInput(input);
    const medication = await this.findOwnedMedicationDocument(
      ownerId,
      medicationId,
    );
    const originalPetId = medication.petId.toString();

    const startDate = dto.startDate ?? medication.startDate;
    const endDate =
      dto.endDate !== undefined ? dto.endDate : medication.endDate;
    this.assertEndDateNotBeforeStartDate(startDate, endDate);

    if (dto.name !== undefined) {
      medication.name = dto.name;
    }
    if (dto.dosage !== undefined) {
      medication.dosage = dto.dosage;
    }
    if (dto.dosageUnit !== undefined) {
      medication.dosageUnit = dto.dosageUnit;
    }
    if (dto.frequency !== undefined) {
      medication.frequency = dto.frequency;
    }
    if (dto.startDate !== undefined) {
      medication.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      medication.endDate = dto.endDate;
    }
    if (dto.veterinarianName !== undefined) {
      medication.veterinarianName = dto.veterinarianName;
    }
    if (dto.clinicName !== undefined) {
      medication.clinicName = dto.clinicName;
    }
    if (dto.notes !== undefined) {
      medication.notes = dto.notes;
    }
    if (dto.isActive !== undefined) {
      medication.isActive = dto.isActive;
    }

    try {
      await medication.save();
      if (medication.petId.toString() !== originalPetId) {
        throw new BadRequestException('petId cannot be changed');
      }
      return this.toMedicationModel(medication);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update medication');
    }
  }

  async deleteMedication(
    ownerId: string,
    medicationId: string,
  ): Promise<boolean> {
    const medication = await this.findOwnedMedicationDocument(
      ownerId,
      medicationId,
    );
    await medication.deleteOne();
    return true;
  }

  private async findOwnedMedicationDocument(
    ownerId: string,
    medicationId: string,
  ): Promise<MedicationDocument> {
    if (!isValidObjectId(medicationId)) {
      throw new NotFoundException('Medication not found');
    }

    const medication = await this.medicationModel.findById(medicationId).exec();
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.petOwnershipService.assertPetBelongsToOwner(
      ownerId,
      medication.petId.toString(),
      'Medication not found',
    );

    return medication;
  }

  private assertEndDateNotBeforeStartDate(
    startDate: Date,
    endDate?: Date,
  ): void {
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }
  }

  private async validateCreateInput(
    input: CreateMedicationInput,
  ): Promise<CreateMedicationInput> {
    const dto = plainToInstance(CreateMedicationInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateUpdateInput(
    input: UpdateMedicationInput,
  ): Promise<UpdateMedicationInput> {
    const dto = plainToInstance(UpdateMedicationInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (
      dto.name === undefined &&
      dto.dosage === undefined &&
      dto.dosageUnit === undefined &&
      dto.frequency === undefined &&
      dto.startDate === undefined &&
      dto.endDate === undefined &&
      dto.veterinarianName === undefined &&
      dto.clinicName === undefined &&
      dto.notes === undefined &&
      dto.isActive === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    return dto;
  }

  private toMedicationModel(document: MedicationDocument): MedicationModel {
    return {
      id: document._id.toString(),
      petId: document.petId.toString(),
      name: document.name,
      dosage: document.dosage,
      dosageUnit: document.dosageUnit,
      frequency: document.frequency,
      startDate: document.startDate,
      endDate: document.endDate,
      veterinarianName: document.veterinarianName,
      clinicName: document.clinicName,
      notes: document.notes,
      isActive: document.isActive,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
