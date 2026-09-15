import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreatePetInput } from './dto/create-pet.input';
import { UpdatePetInput } from './dto/update-pet.input';
import { Pet } from './schemas/pet.schema';
import { PetsService } from './pets.service';

describe('PetsService', () => {
  let service: PetsService;

  const ownerId = '507f1f77bcf86cd799439011';
  const otherOwnerId = '507f1f77bcf86cd799439012';
  const petId = '507f1f77bcf86cd799439021';

  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');

  const buildPetDocument = (owner: string) => ({
    _id: new Types.ObjectId(petId),
    ownerId: new Types.ObjectId(owner),
    name: 'Buddy',
    species: 'Dog',
    breed: 'Labrador',
    gender: 'male',
    birthDate: new Date('2020-05-01T00:00:00.000Z'),
    microchipNumber: '123456',
    createdAt,
    updatedAt,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  });

  const petModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetsService,
        {
          provide: getModelToken(Pet.name),
          useValue: petModelMock,
        },
      ],
    }).compile();

    service = module.get<PetsService>(PetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPet', () => {
    it('creates a pet for the authenticated user', async () => {
      const document = buildPetDocument(ownerId);
      petModelMock.create.mockResolvedValue(document);

      const input: CreatePetInput = {
        name: '  Buddy ',
        species: ' Dog ',
        breed: ' Labrador ',
      };

      const result = await service.createPet(ownerId, input);

      expect(petModelMock.create).toHaveBeenCalledWith({
        ownerId: new Types.ObjectId(ownerId),
        name: 'Buddy',
        species: 'Dog',
        breed: 'Labrador',
        gender: undefined,
        birthDate: undefined,
        microchipNumber: undefined,
      });
      expect(result.ownerId).toBe(ownerId);
      expect(result.name).toBe('Buddy');
    });

    it('rejects missing required fields', async () => {
      await expect(
        service.createPet(ownerId, {
          name: '   ',
          species: 'Dog',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findMyPets', () => {
    it('lists only pets for the given owner', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([ownedPet]),
        }),
      });

      const result = await service.findMyPets(ownerId);

      expect(petModelMock.find).toHaveBeenCalledWith({
        ownerId: new Types.ObjectId(ownerId),
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.ownerId).toBe(ownerId);
    });
  });

  describe('findPetByIdForOwner', () => {
    it('returns a pet owned by the user', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const result = await service.findPetByIdForOwner(ownerId, petId);

      expect(petModelMock.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(petId),
        ownerId: new Types.ObjectId(ownerId),
      });
      expect(result.id).toBe(petId);
    });

    it('prevents access to another user pet', async () => {
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findPetByIdForOwner(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updatePet', () => {
    it('updates a pet owned by the user', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const input: UpdatePetInput = {
        name: '  Max ',
      };

      const result = await service.updatePet(ownerId, petId, input);

      expect(ownedPet.save).toHaveBeenCalled();
      expect(result.name).toBe('Max');
    });

    it('does not update another user pet', async () => {
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updatePet(otherOwnerId, petId, { name: 'Max' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects empty updates', async () => {
      await expect(
        service.updatePet(ownerId, petId, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deletePet', () => {
    it('deletes a pet owned by the user', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      await expect(service.deletePet(ownerId, petId)).resolves.toBe(true);
      expect(ownedPet.deleteOne).toHaveBeenCalled();
    });

    it('does not delete another user pet', async () => {
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.deletePet(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
