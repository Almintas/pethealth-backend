import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import sharp from 'sharp';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Appointment } from '../appointments/schemas/appointment.schema';
import { Reminder } from '../reminders/schemas/reminder.schema';
import { MedicalRecord } from '../medical-records/schemas/medical-record.schema';
import { Medication } from '../medications/schemas/medication.schema';
import { Vaccination } from '../vaccinations/schemas/vaccination.schema';
import { ACTIVE_PET_FILTER } from './constants/active-pet-filter';
import { CreatePetInput } from './dto/create-pet.input';
import { UpdatePetInput } from './dto/update-pet.input';
import { PET_PHOTO_STORAGE } from '../pet-photos/pet-photo-storage.interface';
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
    photoUrl: undefined as string | undefined,
    photoStorageKey: undefined as string | undefined,
    deletedAt: null,
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

  const relatedModelMock = {
    deleteMany: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
  };

  const petPhotoStorageMock = {
    storePetPhoto: jest.fn(),
    deletePetPhoto: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetsService,
        { provide: getModelToken(Pet.name), useValue: petModelMock },
        {
          provide: getModelToken(MedicalRecord.name),
          useValue: relatedModelMock,
        },
        {
          provide: getModelToken(Vaccination.name),
          useValue: relatedModelMock,
        },
        {
          provide: getModelToken(Medication.name),
          useValue: relatedModelMock,
        },
        {
          provide: getModelToken(Appointment.name),
          useValue: relatedModelMock,
        },
        {
          provide: getModelToken(Reminder.name),
          useValue: relatedModelMock,
        },
        {
          provide: PET_PHOTO_STORAGE,
          useValue: petPhotoStorageMock,
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
        deletedAt: null,
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
    it('lists only active pets for the given owner', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([ownedPet]),
        }),
      });

      const result = await service.findMyPets(ownerId);

      expect(petModelMock.find).toHaveBeenCalledWith({
        ownerId: new Types.ObjectId(ownerId),
        ...ACTIVE_PET_FILTER,
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.ownerId).toBe(ownerId);
    });
  });

  describe('findPetByIdForOwner', () => {
    it('returns an active pet owned by the user', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const result = await service.findPetByIdForOwner(ownerId, petId);

      expect(petModelMock.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(petId),
        ownerId: new Types.ObjectId(ownerId),
        ...ACTIVE_PET_FILTER,
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
    it('soft deletes the pet and removes related records', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      await expect(service.deletePet(ownerId, petId)).resolves.toBe(true);

      expect(relatedModelMock.deleteMany).toHaveBeenCalledTimes(5);
      expect(ownedPet.save).toHaveBeenCalled();
      expect(ownedPet.deletedAt).toBeInstanceOf(Date);
      expect(ownedPet.deleteOne).not.toHaveBeenCalled();
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

  describe('uploadPetPhoto', () => {
    it('stores a photo for an owned pet', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const png = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 3,
          background: '#224466',
        },
      })
        .png()
        .toBuffer();

      petPhotoStorageMock.storePetPhoto.mockResolvedValue({
        storageKey: 'new-key.webp',
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/new-key.webp',
      });

      const result = await service.uploadPetPhoto(ownerId, petId, png);

      expect(petPhotoStorageMock.storePetPhoto).toHaveBeenCalled();
      expect(ownedPet.save).toHaveBeenCalled();
      expect(result.photoUrl).toContain('new-key.webp');
    });

    it('does not upload for another user pet', async () => {
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const png = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: '#000000',
        },
      })
        .png()
        .toBuffer();

      await expect(
        service.uploadPetPhoto(otherOwnerId, petId, png),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removePetPhoto', () => {
    it('clears photo metadata and deletes storage object', async () => {
      const ownedPet = buildPetDocument(ownerId);
      ownedPet.photoUrl = 'http://example.com/photo.webp';
      ownedPet.photoStorageKey = 'old-key.webp';

      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const result = await service.removePetPhoto(ownerId, petId);

      expect(ownedPet.photoUrl).toBeUndefined();
      expect(ownedPet.photoStorageKey).toBeUndefined();
      expect(petPhotoStorageMock.deletePetPhoto).toHaveBeenCalledWith(
        'old-key.webp',
      );
      expect(result.photoUrl).toBeUndefined();
    });

    it('does not remove photo for another user pet', async () => {
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removePetPhoto(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(petPhotoStorageMock.deletePetPhoto).not.toHaveBeenCalled();
    });
  });

  describe('uploadPetPhoto storage failures', () => {
    it('surfaces missing Cloudinary configuration', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const png = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: '#112233',
        },
      })
        .png()
        .toBuffer();

      petPhotoStorageMock.storePetPhoto.mockRejectedValue(
        new ServiceUnavailableException('Pet photo uploads are not available'),
      );

      await expect(
        service.uploadPetPhoto(ownerId, petId, png),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('deletes previous storage key after successful replacement', async () => {
      const ownedPet = buildPetDocument(ownerId);
      ownedPet.photoStorageKey = 'old-key';

      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const png = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: '#445566',
        },
      })
        .png()
        .toBuffer();

      petPhotoStorageMock.storePetPhoto.mockResolvedValue({
        storageKey: 'new-key',
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/new-key.webp',
      });

      await service.uploadPetPhoto(ownerId, petId, png);

      expect(petPhotoStorageMock.deletePetPhoto).toHaveBeenCalledWith(
        'old-key',
      );
    });

    it('removes uploaded storage when database save fails', async () => {
      const ownedPet = buildPetDocument(ownerId);
      petModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ownedPet),
      });

      const png = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: '#aabbcc',
        },
      })
        .png()
        .toBuffer();

      petPhotoStorageMock.storePetPhoto.mockResolvedValue({
        storageKey: 'orphan-key',
        photoUrl:
          'https://res.cloudinary.com/demo/image/upload/orphan-key.webp',
      });
      ownedPet.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.uploadPetPhoto(ownerId, petId, png),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(petPhotoStorageMock.deletePetPhoto).toHaveBeenCalledWith(
        'orphan-key',
      );
    });
  });
});
