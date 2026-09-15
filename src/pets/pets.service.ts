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
import {
  MedicalRecord,
  MedicalRecordDocument,
} from '../medical-records/schemas/medical-record.schema';
import {
  Medication,
  MedicationDocument,
} from '../medications/schemas/medication.schema';
import {
  Vaccination,
  VaccinationDocument,
} from '../vaccinations/schemas/vaccination.schema';
import {
  Appointment,
  AppointmentDocument,
} from '../appointments/schemas/appointment.schema';
import {
  Reminder,
  ReminderDocument,
} from '../reminders/schemas/reminder.schema';
import { ACTIVE_PET_FILTER } from './constants/active-pet-filter';
import { CreatePetInput } from './dto/create-pet.input';
import { UpdatePetInput } from './dto/update-pet.input';
import { PetModel } from './models/pet.model';
import { Pet, PetDocument } from './schemas/pet.schema';

@Injectable()
export class PetsService {
  constructor(
    @InjectModel(Pet.name) private readonly petModel: Model<PetDocument>,
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecordDocument>,
    @InjectModel(Vaccination.name)
    private readonly vaccinationModel: Model<VaccinationDocument>,
    @InjectModel(Medication.name)
    private readonly medicationModel: Model<MedicationDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
  ) {}

  async createPet(ownerId: string, input: CreatePetInput): Promise<PetModel> {
    const dto = await this.validateCreatePetInput(input);

    try {
      const created = await this.petModel.create({
        ownerId: new Types.ObjectId(ownerId),
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        gender: dto.gender,
        birthDate: dto.birthDate,
        microchipNumber: dto.microchipNumber,
        deletedAt: null,
      });

      return this.toPetModel(created);
    } catch {
      throw new InternalServerErrorException('Failed to create pet');
    }
  }

  async findMyPets(ownerId: string): Promise<PetModel[]> {
    const pets = await this.petModel
      .find({
        ownerId: new Types.ObjectId(ownerId),
        ...ACTIVE_PET_FILTER,
      })
      .sort({ createdAt: -1 })
      .exec();

    return pets.map((pet) => this.toPetModel(pet));
  }

  async findPetByIdForOwner(ownerId: string, petId: string): Promise<PetModel> {
    const pet = await this.findOwnedPetDocument(ownerId, petId);
    return this.toPetModel(pet);
  }

  async updatePet(
    ownerId: string,
    petId: string,
    input: UpdatePetInput,
  ): Promise<PetModel> {
    const dto = await this.validateUpdatePetInput(input);
    const pet = await this.findOwnedPetDocument(ownerId, petId);

    if (dto.name !== undefined) {
      pet.name = dto.name;
    }
    if (dto.species !== undefined) {
      pet.species = dto.species;
    }
    if (dto.breed !== undefined) {
      pet.breed = dto.breed;
    }
    if (dto.gender !== undefined) {
      pet.gender = dto.gender;
    }
    if (dto.birthDate !== undefined) {
      pet.birthDate = dto.birthDate;
    }
    if (dto.microchipNumber !== undefined) {
      pet.microchipNumber = dto.microchipNumber;
    }

    try {
      await pet.save();
      return this.toPetModel(pet);
    } catch {
      throw new InternalServerErrorException('Failed to update pet');
    }
  }

  async deletePet(ownerId: string, petId: string): Promise<boolean> {
    const pet = await this.findOwnedPetDocument(ownerId, petId);

    try {
      await this.deletePetRelatedRecords(pet._id);
      pet.deletedAt = new Date();
      await pet.save();
      return true;
    } catch {
      throw new InternalServerErrorException('Failed to delete pet');
    }
  }

  private async deletePetRelatedRecords(
    petObjectId: Types.ObjectId,
  ): Promise<void> {
    await Promise.all([
      this.medicalRecordModel.deleteMany({ petId: petObjectId }).exec(),
      this.vaccinationModel.deleteMany({ petId: petObjectId }).exec(),
      this.medicationModel.deleteMany({ petId: petObjectId }).exec(),
      this.appointmentModel.deleteMany({ petId: petObjectId }).exec(),
      this.reminderModel.deleteMany({ petId: petObjectId }).exec(),
    ]);
  }

  private async findOwnedPetDocument(
    ownerId: string,
    petId: string,
  ): Promise<PetDocument> {
    if (!isValidObjectId(petId) || !isValidObjectId(ownerId)) {
      throw new NotFoundException('Pet not found');
    }

    const pet = await this.petModel
      .findOne({
        _id: new Types.ObjectId(petId),
        ownerId: new Types.ObjectId(ownerId),
        ...ACTIVE_PET_FILTER,
      })
      .exec();

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    return pet;
  }

  private async validateCreatePetInput(
    input: CreatePetInput,
  ): Promise<CreatePetInput> {
    const dto = plainToInstance(CreatePetInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateUpdatePetInput(
    input: UpdatePetInput,
  ): Promise<UpdatePetInput> {
    const dto = plainToInstance(UpdatePetInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    if (
      dto.name === undefined &&
      dto.species === undefined &&
      dto.breed === undefined &&
      dto.gender === undefined &&
      dto.birthDate === undefined &&
      dto.microchipNumber === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    return dto;
  }

  private toPetModel(document: PetDocument): PetModel {
    return {
      id: document._id.toString(),
      ownerId: document.ownerId.toString(),
      name: document.name,
      species: document.species,
      breed: document.breed,
      gender: document.gender,
      birthDate: document.birthDate,
      microchipNumber: document.microchipNumber,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
