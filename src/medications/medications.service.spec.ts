import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { CreateMedicationInput } from './dto/create-medication.input';
import { UpdateMedicationInput } from './dto/update-medication.input';
import { Medication } from './schemas/medication.schema';
import { MedicationsService } from './medications.service';

describe('MedicationsService', () => {
  let service: MedicationsService;

  const ownerId = '507f1f77bcf86cd799439011';
  const otherOwnerId = '507f1f77bcf86cd799439012';
  const petId = '507f1f77bcf86cd799439021';
  const medicationId = '507f1f77bcf86cd799439051';

  const startDate = new Date('2024-03-01T00:00:00.000Z');
  const endDate = new Date('2024-09-01T00:00:00.000Z');
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');

  const petOwnershipServiceMock = {
    assertPetBelongsToOwner: jest.fn(),
  };

  const medicationModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const buildMedicationDocument = (pet: string, isActive = true) => ({
    _id: new Types.ObjectId(medicationId),
    petId: new Types.ObjectId(pet),
    name: 'Apoquel',
    dosage: 16,
    dosageUnit: 'mg',
    frequency: 'daily',
    startDate,
    endDate,
    isActive,
    createdAt,
    updatedAt,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        {
          provide: getModelToken(Medication.name),
          useValue: medicationModelMock,
        },
        {
          provide: PetOwnershipService,
          useValue: petOwnershipServiceMock,
        },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMedication', () => {
    it('creates a medication for the user pet with isActive defaulting to true', async () => {
      const document = buildMedicationDocument(petId);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });
      medicationModelMock.create.mockResolvedValue(document);

      const input: CreateMedicationInput = {
        petId,
        name: ' Apoquel ',
        dosage: 16,
        dosageUnit: ' mg ',
        frequency: ' daily ',
        startDate,
        endDate,
      };

      const result = await service.createMedication(ownerId, input);

      expect(medicationModelMock.create).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
        name: 'Apoquel',
        dosage: 16,
        dosageUnit: 'mg',
        frequency: 'daily',
        startDate,
        endDate,
        veterinarianName: undefined,
        clinicName: undefined,
        notes: undefined,
        isActive: true,
      });
      expect(result.isActive).toBe(true);
    });

    it('allows explicitly setting isActive', async () => {
      const document = buildMedicationDocument(petId, false);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });
      medicationModelMock.create.mockResolvedValue(document);

      await service.createMedication(ownerId, {
        petId,
        name: 'Apoquel',
        dosage: 16,
        dosageUnit: 'mg',
        frequency: 'daily',
        startDate,
        isActive: false,
      });

      expect(medicationModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('rejects endDate earlier than startDate', async () => {
      await expect(
        service.createMedication(ownerId, {
          petId,
          name: 'Apoquel',
          dosage: 16,
          dosageUnit: 'mg',
          frequency: 'daily',
          startDate,
          endDate: new Date('2023-01-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('treats another user pet as not found', async () => {
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.createMedication(otherOwnerId, {
          petId,
          name: 'Apoquel',
          dosage: 16,
          dosageUnit: 'mg',
          frequency: 'daily',
          startDate,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findMedicationsForPet', () => {
    it('lists medications for the user pet', async () => {
      const document = buildMedicationDocument(petId);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });
      medicationModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([document]),
        }),
      });

      const result = await service.findMedicationsForPet(ownerId, petId);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(medicationId);
    });

    it('prevents listing medications for another user pet', async () => {
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.findMedicationsForPet(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findMedicationByIdForOwner', () => {
    it('reads a medication for the user pet', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      const result = await service.findMedicationByIdForOwner(
        ownerId,
        medicationId,
      );

      expect(result.id).toBe(medicationId);
    });

    it('prevents reading another user medication', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Medication not found'),
      );

      await expect(
        service.findMedicationByIdForOwner(otherOwnerId, medicationId),
      ).rejects.toThrow('Medication not found');
    });
  });

  describe('updateMedication', () => {
    it('updates a medication for the user pet', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      const input: UpdateMedicationInput = {
        name: ' Updated Apoquel ',
      };

      const result = await service.updateMedication(
        ownerId,
        medicationId,
        input,
      );

      expect(document.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Apoquel');
      expect(result.petId).toBe(petId);
    });

    it('prevents changing petId', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      await expect(
        service.updateMedication(ownerId, medicationId, {
          name: 'Updated Apoquel',
          petId: '507f1f77bcf86cd799439099',
        } as UpdateMedicationInput & { petId: string }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid date combinations on update', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      await expect(
        service.updateMedication(ownerId, medicationId, {
          startDate: new Date('2025-06-01T00:00:00.000Z'),
          endDate: new Date('2025-01-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty updates', async () => {
      await expect(
        service.updateMedication(ownerId, medicationId, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteMedication', () => {
    it('deletes a medication for the user pet', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue({
        id: petId,
      });

      await expect(
        service.deleteMedication(ownerId, medicationId),
      ).resolves.toBe(true);
      expect(document.deleteOne).toHaveBeenCalled();
    });

    it('prevents deleting another user medication', async () => {
      const document = buildMedicationDocument(petId);
      medicationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Medication not found'),
      );

      await expect(
        service.deleteMedication(otherOwnerId, medicationId),
      ).rejects.toThrow('Medication not found');
    });
  });
});
