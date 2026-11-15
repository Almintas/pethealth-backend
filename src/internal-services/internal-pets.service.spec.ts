import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PetsService } from '../pets/pets.service';
import { Pet } from '../pets/schemas/pet.schema';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { AccountActivationService } from '../auth/account-activation/account-activation.service';
import { InternalPetsService } from './internal-pets.service';

describe('InternalPetsService', () => {
  let service: InternalPetsService;

  const petId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();

  const petModel = {
    find: jest.fn(),
  };

  const usersService = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAccountStateByEmail: jest.fn(),
    createUser: jest.fn(),
    updateProfile: jest.fn(),
    updateOwnerProfileForVetIntegration: jest.fn(),
  };

  const accountActivationService = {
    sendActivationEmailIfUnclaimed: jest.fn(),
  };

  const petsService = {
    createPet: jest.fn(),
    updateActivePetForService: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalPetsService,
        { provide: getModelToken(Pet.name), useValue: petModel },
        { provide: UsersService, useValue: usersService },
        { provide: PetsService, useValue: petsService },
        {
          provide: AccountActivationService,
          useValue: accountActivationService,
        },
      ],
    }).compile();

    service = module.get(InternalPetsService);
  });

  it('returns active pets with owner summary for valid ids', async () => {
    petModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: petId,
          ownerId,
          name: 'Luna',
          species: 'Cat',
          breed: 'Mixed',
          gender: 'Female',
          birthDate: new Date('2020-01-01'),
        },
      ]),
    });
    usersService.findById.mockResolvedValue({
      id: ownerId.toString(),
      firstName: 'Jane',
      lastName: 'Owner',
      email: 'jane@example.com',
    });

    const result = await service.findActivePetsByIds([petId.toString()]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(petId.toString());
    expect(result[0]?.owner.firstName).toBe('Jane');
  });

  it('skips pets whose owner cannot be resolved', async () => {
    petModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: petId,
          ownerId,
          name: 'Luna',
          species: 'Cat',
        },
      ]),
    });
    usersService.findById.mockResolvedValue(null);

    const result = await service.findActivePetsByIds([petId.toString()]);

    expect(result).toHaveLength(0);
  });

  it('registers a pet for an existing unclaimed placeholder owner', async () => {
    usersService.findAccountStateByEmail.mockResolvedValue({
      user: {
        id: ownerId.toString(),
        firstName: 'Jane',
        lastName: 'Owner',
        email: 'jane@example.com',
        role: UserRole.USER,
      },
      isClaimed: false,
    });
    petsService.createPet.mockResolvedValue({
      id: petId.toString(),
      name: 'Luna',
      species: 'Cat',
    });
    petModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: petId,
          ownerId,
          name: 'Luna',
          species: 'Cat',
        },
      ]),
    });
    usersService.findById.mockResolvedValue({
      id: ownerId.toString(),
      firstName: 'Jane',
      lastName: 'Owner',
      email: 'jane@example.com',
    });

    const result = await service.registerPetForVet({
      owner: {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Owner',
      },
      name: 'Luna',
      species: 'Cat',
    });

    expect(petsService.createPet).toHaveBeenCalledWith(ownerId.toString(), {
      name: 'Luna',
      species: 'Cat',
      breed: undefined,
      gender: undefined,
      birthDate: undefined,
    });
    expect(result.name).toBe('Luna');
  });

  it('refuses to attach a pet to a claimed owner account', async () => {
    usersService.findAccountStateByEmail.mockResolvedValue({
      user: {
        id: ownerId.toString(),
        firstName: 'Jane',
        lastName: 'Owner',
        email: 'jane@example.com',
        role: UserRole.USER,
      },
      isClaimed: true,
    });

    await expect(
      service.registerPetForVet({
        owner: {
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Owner',
        },
        name: 'Luna',
        species: 'Cat',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(petsService.createPet).not.toHaveBeenCalled();
  });

  it('refuses to attach a pet to a non-owner account', async () => {
    usersService.findAccountStateByEmail.mockResolvedValue({
      user: {
        id: ownerId.toString(),
        firstName: 'Vera',
        lastName: 'Vet',
        email: 'vet@example.com',
        role: UserRole.VET,
      },
      isClaimed: false,
    });

    await expect(
      service.registerPetForVet({
        owner: { email: 'vet@example.com', firstName: 'Vera', lastName: 'Vet' },
        name: 'Luna',
        species: 'Cat',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(petsService.createPet).not.toHaveBeenCalled();
  });

  it('creates a placeholder owner when the email is new', async () => {
    usersService.findAccountStateByEmail.mockResolvedValue(null);
    usersService.createUser.mockResolvedValue({ id: ownerId.toString() });
    petsService.createPet.mockResolvedValue({ id: petId.toString() });
    petModel.find.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([
          { _id: petId, ownerId, name: 'Luna', species: 'Cat' },
        ]),
    });
    usersService.findById.mockResolvedValue({
      id: ownerId.toString(),
      firstName: 'New',
      lastName: 'Owner',
      email: 'new@example.com',
    });

    await service.registerPetForVet({
      owner: { email: 'new@example.com', firstName: 'New', lastName: 'Owner' },
      name: 'Luna',
      species: 'Cat',
    });

    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'Owner',
      role: UserRole.USER,
    });
    expect(
      accountActivationService.sendActivationEmailIfUnclaimed,
    ).toHaveBeenCalledWith('new@example.com');
    expect(petsService.createPet).toHaveBeenCalled();
  });

  it('updates owner first and last name for a pet via canonical owner profile', async () => {
    petModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: petId,
          ownerId,
          name: 'Luna',
          species: 'Cat',
        },
      ]),
    });
    let ownerUpdated = false;
    usersService.updateOwnerProfileForVetIntegration.mockImplementation(() => {
      ownerUpdated = true;
      return Promise.resolve({
        id: ownerId.toString(),
        firstName: 'Janet',
        lastName: 'Ownerson',
        email: 'janet@example.com',
      });
    });
    usersService.findById.mockImplementation(() =>
      Promise.resolve({
        id: ownerId.toString(),
        firstName: ownerUpdated ? 'Janet' : 'Jane',
        lastName: ownerUpdated ? 'Ownerson' : 'Owner',
        email: ownerUpdated ? 'janet@example.com' : 'jane@example.com',
      }),
    );
    const result = await service.updateOwnerProfileForVet(petId.toString(), {
      firstName: 'Janet',
      lastName: 'Ownerson',
      email: 'janet@example.com',
    });

    expect(
      usersService.updateOwnerProfileForVetIntegration,
    ).toHaveBeenCalledWith(ownerId.toString(), {
      firstName: 'Janet',
      lastName: 'Ownerson',
      email: 'janet@example.com',
    });
    expect(
      usersService.updateOwnerProfileForVetIntegration,
    ).toHaveBeenCalledTimes(1);
    expect(result.owner.firstName).toBe('Janet');
    expect(result.owner.lastName).toBe('Ownerson');
    expect(result.owner.email).toBe('janet@example.com');
  });

  it('resolves owner through pet id and does not accept a separate owner id', async () => {
    petModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    await expect(
      service.updateOwnerProfileForVet(petId.toString(), {
        firstName: 'A',
        lastName: 'B',
        email: 'a@example.com',
      }),
    ).rejects.toThrow('Patient not found');

    expect(
      usersService.updateOwnerProfileForVetIntegration,
    ).not.toHaveBeenCalled();
  });

  it('propagates canonical owner name to every pet loaded for that owner', async () => {
    const otherPetId = new Types.ObjectId();
    petModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: petId,
          ownerId,
          name: 'Luna',
          species: 'Cat',
        },
        {
          _id: otherPetId,
          ownerId,
          name: 'Bella',
          species: 'Dog',
        },
      ]),
    });
    usersService.findById.mockResolvedValue({
      id: ownerId.toString(),
      firstName: 'Janet',
      lastName: 'Ownerson',
      email: 'jane@example.com',
    });
    usersService.updateOwnerProfileForVetIntegration.mockResolvedValue({
      id: ownerId.toString(),
      firstName: 'Janet',
      lastName: 'Ownerson',
      email: 'janet@example.com',
    });

    await service.updateOwnerProfileForVet(petId.toString(), {
      firstName: 'Janet',
      lastName: 'Ownerson',
      email: 'janet@example.com',
    });

    const allPets = await service.findActivePetsByIds([
      petId.toString(),
      otherPetId.toString(),
    ]);

    expect(allPets).toHaveLength(2);
    expect(allPets.every((pet) => pet.owner.lastName === 'Ownerson')).toBe(
      true,
    );
  });
});
