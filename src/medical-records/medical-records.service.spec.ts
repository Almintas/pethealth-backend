import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { CreateMedicalRecordInput } from './dto/create-medical-record.input';
import { UpdateMedicalRecordInput } from './dto/update-medical-record.input';
import { Pet } from '../pets/schemas/pet.schema';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecord } from './schemas/medical-record.schema';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

  const ownerId = '507f1f77bcf86cd799439011';
  const otherOwnerId = '507f1f77bcf86cd799439012';
  const petId = '507f1f77bcf86cd799439021';
  const recordId = '507f1f77bcf86cd799439031';

  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');
  const recordDate = new Date('2024-03-15T00:00:00.000Z');

  const petOwnershipServiceMock = {
    assertPetBelongsToOwner: jest.fn(),
  };

  const medicalRecordModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  };

  const petModelMock = {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  };

  const buildRecordDocument = (pet: string) => ({
    _id: new Types.ObjectId(recordId),
    petId: new Types.ObjectId(pet),
    date: recordDate,
    type: 'checkup',
    title: 'Annual checkup',
    description: 'Routine visit',
    createdAt,
    updatedAt,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        {
          provide: getModelToken(MedicalRecord.name),
          useValue: medicalRecordModelMock,
        },
        {
          provide: PetOwnershipService,
          useValue: petOwnershipServiceMock,
        },
        {
          provide: getModelToken(Pet.name),
          useValue: petModelMock,
        },
      ],
    }).compile();

    petModelMock.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMedicalRecord', () => {
    it('creates a medical record for the user pet', async () => {
      const document = buildRecordDocument(petId);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });
      medicalRecordModelMock.create.mockResolvedValue(document);

      const input: CreateMedicalRecordInput = {
        petId,
        date: recordDate,
        type: ' checkup ',
        title: ' Annual checkup ',
        description: ' Routine visit ',
      };

      const result = await service.createMedicalRecord(ownerId, input);

      expect(
        petOwnershipServiceMock.assertPetBelongsToOwner,
      ).toHaveBeenCalledWith(ownerId, petId, 'Pet not found');
      expect(medicalRecordModelMock.create).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
        date: recordDate,
        type: 'checkup',
        title: 'Annual checkup',
        description: 'Routine visit',
        diagnosis: undefined,
        veterinarianName: undefined,
        clinicName: undefined,
        notes: undefined,
      });
      expect(result.petId).toBe(petId);
      expect(result.title).toBe('Annual checkup');
    });

    it('treats another user pet as not found', async () => {
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.createMedicalRecord(otherOwnerId, {
          petId,
          date: recordDate,
          type: 'checkup',
          title: 'Annual checkup',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects invalid input', async () => {
      await expect(
        service.createMedicalRecord(ownerId, {
          petId: 'invalid-pet-id',
          date: recordDate,
          type: 'checkup',
          title: 'Annual checkup',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findMedicalRecordsForPet', () => {
    it('lists records for the user pet', async () => {
      const document = buildRecordDocument(petId);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });
      medicalRecordModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([document]),
        }),
      });

      const result = await service.findMedicalRecordsForPet(ownerId, petId);

      expect(medicalRecordModelMock.find).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(recordId);
    });

    it('prevents listing records for another user pet', async () => {
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.findMedicalRecordsForPet(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findMedicalRecordByIdForOwner', () => {
    it('returns a record owned through the user pet', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      const result = await service.findMedicalRecordByIdForOwner(
        ownerId,
        recordId,
      );

      expect(result.id).toBe(recordId);
    });

    it('prevents access to another user record', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Medical record not found'),
      );

      await expect(
        service.findMedicalRecordByIdForOwner(otherOwnerId, recordId),
      ).rejects.toThrow('Medical record not found');
    });
  });

  describe('updateMedicalRecord', () => {
    it('updates a record for the user pet', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      const input: UpdateMedicalRecordInput = {
        title: ' Updated title ',
      };

      const result = await service.updateMedicalRecord(
        ownerId,
        recordId,
        input,
      );

      expect(document.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated title');
      expect(result.petId).toBe(petId);
    });

    it('prevents changing petId', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      await expect(
        service.updateMedicalRecord(ownerId, recordId, {
          title: 'Updated title',
          petId: '507f1f77bcf86cd799439099',
        } as UpdateMedicalRecordInput & { petId: string }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty updates', async () => {
      await expect(
        service.updateMedicalRecord(ownerId, recordId, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createMedicalRecordForService', () => {
    it('creates a record for an active pet without owner auth', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.create.mockResolvedValue(document);

      const result = await service.createMedicalRecordForService(petId, {
        date: recordDate,
        type: 'checkup',
        title: 'Annual checkup',
      });

      expect(
        petOwnershipServiceMock.assertPetBelongsToOwner,
      ).not.toHaveBeenCalled();
      expect(result.title).toBe('Annual checkup');
    });
  });

  describe('findMedicalRecordsForPetForService', () => {
    it('lists records sorted by date for an active pet', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([document]),
        }),
      });

      const records = await service.findMedicalRecordsForPetForService(petId);

      expect(records).toHaveLength(1);
      expect(records[0]?.petId).toBe(petId);
    });
  });

  describe('findMedicalRecordsPageForService', () => {
    it('returns paginated records sorted newest first', async () => {
      const newer = buildRecordDocument(petId);
      const older = {
        ...buildRecordDocument(petId),
        _id: new Types.ObjectId(),
        date: new Date('2024-01-01T00:00:00.000Z'),
      };
      medicalRecordModelMock.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(52),
      });
      medicalRecordModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([newer, older]),
            }),
          }),
        }),
      });

      const page = await service.findMedicalRecordsPageForService(petId, {
        page: 1,
        limit: 5,
      });

      expect(page.total).toBe(52);
      expect(page.limit).toBe(5);
      expect(page.items).toHaveLength(2);
      expect(medicalRecordModelMock.find).toHaveBeenCalled();
    });

    it('applies search and type filters', async () => {
      medicalRecordModelMock.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      medicalRecordModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      await service.findMedicalRecordsPageForService(petId, {
        page: 1,
        limit: 20,
        search: 'head',
        type: 'FOLLOW_UP',
      });

      expect(medicalRecordModelMock.find).toHaveBeenCalled();
      expect(medicalRecordModelMock.countDocuments).toHaveBeenCalled();
    });
  });

  describe('deleteMedicalRecord', () => {
    it('deletes a record for the user pet', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      await expect(
        service.deleteMedicalRecord(ownerId, recordId),
      ).resolves.toBe(true);
      expect(document.deleteOne).toHaveBeenCalled();
    });

    it('prevents deleting another user record', async () => {
      const document = buildRecordDocument(petId);
      medicalRecordModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Medical record not found'),
      );

      await expect(
        service.deleteMedicalRecord(otherOwnerId, recordId),
      ).rejects.toThrow('Medical record not found');
    });
  });
});
