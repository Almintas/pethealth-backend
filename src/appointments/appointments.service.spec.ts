import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PetsService } from '../pets/pets.service';
import { CreateAppointmentInput } from './dto/create-appointment.input';
import { UpdateAppointmentInput } from './dto/update-appointment.input';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './schemas/appointment.schema';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const ownerId = '507f1f77bcf86cd799439011';
  const otherOwnerId = '507f1f77bcf86cd799439012';
  const petId = '507f1f77bcf86cd799439021';
  const appointmentId = '507f1f77bcf86cd799439061';

  const scheduledAt = new Date('2024-06-01T10:00:00.000Z');
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');

  const petsServiceMock = {
    findPetByIdForOwner: jest.fn(),
  };

  const appointmentModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const buildAppointmentDocument = (
    pet: string,
    status: AppointmentStatus = AppointmentStatus.SCHEDULED,
  ) => ({
    _id: new Types.ObjectId(appointmentId),
    petId: new Types.ObjectId(pet),
    scheduledAt,
    type: 'checkup',
    status,
    createdAt,
    updatedAt,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getModelToken(Appointment.name),
          useValue: appointmentModelMock,
        },
        {
          provide: PetsService,
          useValue: petsServiceMock,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAppointment', () => {
    it('creates an appointment for the user pet with default status', async () => {
      const document = buildAppointmentDocument(petId);
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });
      appointmentModelMock.create.mockResolvedValue(document);

      const input: CreateAppointmentInput = {
        petId,
        scheduledAt,
        type: ' checkup ',
      };

      const result = await service.createAppointment(ownerId, input);

      expect(appointmentModelMock.create).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
        scheduledAt,
        type: 'checkup',
        clinicName: undefined,
        veterinarianName: undefined,
        reason: undefined,
        notes: undefined,
        status: AppointmentStatus.SCHEDULED,
      });
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
    });

    it('rejects invalid scheduledAt values', async () => {
      await expect(
        service.createAppointment(ownerId, {
          petId,
          scheduledAt: new Date('invalid'),
          type: 'checkup',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('treats another user pet as not found', async () => {
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.createAppointment(otherOwnerId, {
          petId,
          scheduledAt,
          type: 'checkup',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAppointmentsForPet', () => {
    it('lists appointments for the user pet', async () => {
      const document = buildAppointmentDocument(petId);
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });
      appointmentModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([document]),
        }),
      });

      const result = await service.findAppointmentsForPet(ownerId, petId);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(appointmentId);
    });

    it('prevents listing appointments for another user pet', async () => {
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.findAppointmentsForPet(otherOwnerId, petId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAppointmentByIdForOwner', () => {
    it('reads an appointment for the user pet', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      const result = await service.findAppointmentByIdForOwner(
        ownerId,
        appointmentId,
      );

      expect(result.id).toBe(appointmentId);
    });

    it('prevents reading another user appointment', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.findAppointmentByIdForOwner(otherOwnerId, appointmentId),
      ).rejects.toThrow('Appointment not found');
    });
  });

  describe('updateAppointment', () => {
    it('updates an appointment for the user pet', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      const result = await service.updateAppointment(ownerId, appointmentId, {
        type: ' vaccination ',
      });

      expect(document.save).toHaveBeenCalled();
      expect(result.type).toBe('vaccination');
    });

    it('changes appointment status', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      const result = await service.updateAppointment(ownerId, appointmentId, {
        status: AppointmentStatus.COMPLETED,
      });

      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('prevents changing petId', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      await expect(
        service.updateAppointment(ownerId, appointmentId, {
          type: 'checkup',
          petId: '507f1f77bcf86cd799439099',
        } as UpdateAppointmentInput & { petId: string }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty updates', async () => {
      await expect(
        service.updateAppointment(ownerId, appointmentId, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteAppointment', () => {
    it('deletes an appointment for the user pet', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockResolvedValue({ id: petId });

      await expect(
        service.deleteAppointment(ownerId, appointmentId),
      ).resolves.toBe(true);
      expect(document.deleteOne).toHaveBeenCalled();
    });

    it('prevents deleting another user appointment', async () => {
      const document = buildAppointmentDocument(petId);
      appointmentModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petsServiceMock.findPetByIdForOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.deleteAppointment(otherOwnerId, appointmentId),
      ).rejects.toThrow('Appointment not found');
    });
  });
});
