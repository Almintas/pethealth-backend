import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { CreatePetInput } from '../pets/dto/create-pet.input';
import { UpdatePetInput } from '../pets/dto/update-pet.input';
import { PetsService } from '../pets/pets.service';
import { ACTIVE_PET_FILTER } from '../pets/constants/active-pet-filter';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { InternalRegisterPetForVetInput } from './dto/internal-register-pet-for-vet.input';
import { InternalUpdateOwnerProfileForVetInput } from './dto/internal-update-owner-profile-for-vet.input';
import { InternalUpdatePetForVetInput } from './dto/internal-update-pet-for-vet.input';
import { InternalPetForVet } from './models/internal-pet-for-vet.model';
import { PetOwnerSummaryForVet } from './models/pet-owner-summary-for-vet.model';

@Injectable()
export class InternalPetsService {
  constructor(
    @InjectModel(Pet.name) private readonly petModel: Model<PetDocument>,
    private readonly usersService: UsersService,
    private readonly petsService: PetsService,
  ) {}

  async findActivePetsByIds(petIds: string[]): Promise<InternalPetForVet[]> {
    const uniqueIds = [
      ...new Set(petIds.map((id) => id.trim()).filter(Boolean)),
    ];
    const objectIds = uniqueIds
      .filter((id) => isValidObjectId(id))
      .map((id) => new Types.ObjectId(id));

    if (!objectIds.length) {
      return [];
    }

    const pets = await this.petModel
      .find({
        _id: { $in: objectIds },
        ...ACTIVE_PET_FILTER,
      })
      .exec();

    const ownerIds = [...new Set(pets.map((pet) => pet.ownerId.toString()))];
    const ownerMap = new Map<string, PetOwnerSummaryForVet>();

    await Promise.all(
      ownerIds.map(async (ownerId) => {
        const owner = await this.usersService.findById(ownerId);
        if (!owner) {
          return;
        }
        ownerMap.set(ownerId, {
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
        });
      }),
    );

    const results: InternalPetForVet[] = [];
    for (const pet of pets) {
      const owner = ownerMap.get(pet.ownerId.toString());
      if (!owner) {
        continue;
      }
      results.push({
        id: pet._id.toString(),
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender,
        birthDate: pet.birthDate,
        owner,
      });
    }

    return results;
  }

  async registerPetForVet(
    input: InternalRegisterPetForVetInput,
  ): Promise<InternalPetForVet> {
    const ownerId = await this.resolveOwnerIdForVetRegistration(input.owner);
    const createInput: CreatePetInput = {
      name: input.name,
      species: input.species,
      breed: input.breed,
      gender: input.gender,
      birthDate: input.birthDate,
    };
    const created = await this.petsService.createPet(ownerId, createInput);
    const mapped = await this.findActivePetsByIds([created.id]);
    const pet = mapped[0];
    if (!pet) {
      throw new Error('Failed to load registered pet');
    }
    return pet;
  }

  async updateOwnerProfileForVet(
    petId: string,
    input: InternalUpdateOwnerProfileForVetInput,
  ): Promise<InternalPetForVet> {
    const pets = await this.findActivePetsByIds([petId]);
    const pet = pets[0];
    if (!pet) {
      throw new NotFoundException('Patient not found');
    }

    await this.usersService.updateOwnerProfileForVetIntegration(pet.owner.id, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    });

    const refreshed = await this.findActivePetsByIds([petId]);
    const updated = refreshed[0];
    if (!updated) {
      throw new NotFoundException('Patient not found');
    }
    return updated;
  }

  async updatePetForVet(
    petId: string,
    input: InternalUpdatePetForVetInput,
  ): Promise<InternalPetForVet> {
    const updateInput: UpdatePetInput = {
      name: input.name,
      species: input.species,
      breed: input.breed,
      gender: input.gender,
      birthDate: input.birthDate,
    };
    const updated = await this.petsService.updateActivePetForService(
      petId,
      updateInput,
    );
    const mapped = await this.findActivePetsByIds([updated.id]);
    const pet = mapped[0];
    if (!pet) {
      throw new Error('Failed to load updated pet');
    }
    return pet;
  }

  private async resolveOwnerIdForVetRegistration(
    owner: InternalRegisterPetForVetInput['owner'],
  ): Promise<string> {
    const existing = await this.usersService.findByEmail(owner.email);
    if (existing) {
      return existing.id;
    }

    const created = await this.usersService.createUser({
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
      role: UserRole.USER,
    });
    return created.id;
  }
}
