import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PetsService } from '../pets/pets.service';
import { CreateVaccinationInput } from './dto/create-vaccination.input';
import { UpdateVaccinationInput } from './dto/update-vaccination.input';
import { Vaccination } from './schemas/vaccination.schema';
import { VaccinationsService } from './vaccinations.service';

describe('VaccinationsService', () => {
  let service: VaccinationsService;

  const ownerId = '507f1f77bcf86cd799439011';
  const otherOwnerId = '507f1f77bcf86cd799439012';
  const petId = '507f1f77bcf86cd799439021';
  const vaccinationId = '507f1f77bcf86cd799439041';

  const administeredAt = new Date('2024-03-01T00:00:00.000Z');
  const nextDueAt = new Date('2025-03-01T00:00:00.000Z');
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');

  const petsServiceMock = {
    findPetByIdForOwner: jest.fn(),
  };

  const vaccinationModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const buildVaccinationDocument = (pet: string) => ({
    _id: new Types.ObjectId(vaccinationId),
    petId: new Types.ObjectId(pet),
    vaccineName: 'Rabies',
    administeredAt,
    nextDueAt,
    createdAt,
    updatedAt,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaccinationsService,
        {
          provide: getModelToken(Vaccination.name),
          useValue: vaccinationModelMock,
        },
        {
          provide: PetsService,
          useValue: petsServiceMock,
        },
      ],
    }).compile();

    service = module.get<VaccinationsService>(VaccinationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVaccination', () => {
    it('creates a vaccination for the user pet', async () => {
      const document = buildVaccinationDocument(petId);
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });
      vaccinationModelMock.create.mockResolvedValue(document);

      const input: CreateVaccinationInput = {
        petId,
        vaccineName: ' Rabies ',
        administeredAt,
        nextDueAt,
      };

      const result = await service.createVaccination(ownerId, input);

      expect(petsServiceMock.findPetByIdForOwner).toHaveBeenCalledWith(
        ownerId,
        petId,
      );
      expect(vaccinationModelMock.create).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
        vaccineName: 'Rabies',
        administeredAt,
        nextDueAt,
        veterinarianName: undefined,
        clinicName: undefined,
        batchNumber: undefined,
        notes: undefined,
      });
      expect(result.petId).toBe(petId);
    });

    it('rejects nextDueAt earlier than administeredAt', async () => {
      await expect(
        service.createVaccination(ownerId, {
          petId,
          vaccineName: 'Rabies',
          administeredAt,
          nextDueAt: new Date('2023-01-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('treats another user pet as not found', async () => {
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.createVaccination(otherOwnerId, {
          petId,
          vaccineName: 'Rabies',
          administeredAt,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findVaccinationsForPet', () => {
    it('lists vaccinations for the user pet', async () => {
      const document = buildVaccinationDocument(petId);
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });
      vaccinationModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([document]),
        }),
      });

      const result = await service.findVaccinationsForPet(ownerId, petId);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(vaccinationId);
    });

    it('prevents listing vaccinations for another user pet', async () => {
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.findVaccinationsForPet(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findVaccinationByIdForOwner', () => {
    it('reads a vaccination for the user pet', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      const result = await service.findVaccinationByIdForOwner(
        ownerId,
        vaccinationId,
      );

      expect(result.id).toBe(vaccinationId);
    });

    it('prevents reading another user vaccination', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.findVaccinationByIdForOwner(otherOwnerId, vaccinationId),
      ).rejects.toThrow('Vaccination not found');
    });
  });

  describe('updateVaccination', () => {
    it('updates a vaccination for the user pet', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      const input: UpdateVaccinationInput = {
        vaccineName: ' Updated Rabies ',
      };

      const result = await service.updateVaccination(
        ownerId,
        vaccinationId,
        input,
      );

      expect(document.save).toHaveBeenCalled();
      expect(result.vaccineName).toBe('Updated Rabies');
      expect(result.petId).toBe(petId);
    });

    it('prevents changing petId', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      await expect(
        service.updateVaccination(ownerId, vaccinationId, {
          vaccineName: 'Updated Rabies',
          petId: '507f1f77bcf86cd799439099',
        } as UpdateVaccinationInput & { petId: string }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid date combinations on update', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      await expect(
        service.updateVaccination(ownerId, vaccinationId, {
          administeredAt: new Date('2025-06-01T00:00:00.000Z'),
          nextDueAt: new Date('2025-01-01T00:00:00.000Z'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteVaccination', () => {
    it('deletes a vaccination for the user pet', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      await expect(
        service.deleteVaccination(ownerId, vaccinationId),
      ).resolves.toBe(true);
      expect(document.deleteOne).toHaveBeenCalled();
    });

    it('prevents deleting another user vaccination', async () => {
      const document = buildVaccinationDocument(petId);
      vaccinationModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.deleteVaccination(otherOwnerId, vaccinationId),
      ).rejects.toThrow('Vaccination not found');
    });
  });
});
