import { Pet } from '../pets/schemas/pet.schema';
import { ReminderManagedBy } from './enums/reminder-managed-by.enum';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Appointment } from '../appointments/schemas/appointment.schema';
import { Medication } from '../medications/schemas/medication.schema';
import { Vaccination } from '../vaccinations/schemas/vaccination.schema';
import { PetOwnershipService } from '../pets/pet-ownership.service';
import { CreateReminderInput } from './dto/create-reminder.input';
import { UpdateReminderInput } from './dto/update-reminder.input';
import { ReminderStatus } from './enums/reminder-status.enum';
import { ReminderType } from './enums/reminder-type.enum';
import { SourceType } from './enums/source-type.enum';
import { RemindersService } from './reminders.service';
import { Reminder } from './schemas/reminder.schema';

describe('RemindersService', () => {
  let service: RemindersService;

  const ownerId = '507f1f77bcf86cd799439011';
  const otherOwnerId = '507f1f77bcf86cd799439012';
  const petId = '507f1f77bcf86cd799439021';
  const reminderId = '507f1f77bcf86cd799439071';
  const sourceId = '507f1f77bcf86cd799439081';

  const dueAt = new Date('2024-06-15T09:00:00.000Z');
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  const updatedAt = new Date('2024-01-02T00:00:00.000Z');

  const petOwnershipServiceMock = {
    assertPetBelongsToOwner: jest.fn(),
  };

  const reminderModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const existsResult = (value: unknown) => ({
    exec: jest.fn().mockResolvedValue(value),
  });
  const vaccinationModelMock = { exists: jest.fn() };
  const medicationModelMock = { exists: jest.fn() };
  const appointmentModelMock = { exists: jest.fn() };
  const petModelMock = { exists: jest.fn() };

  const buildReminderDocument = (
    pet: string,
    status: ReminderStatus = ReminderStatus.PENDING,
  ) => ({
    _id: new Types.ObjectId(reminderId),
    petId: new Types.ObjectId(pet),
    type: ReminderType.GENERAL,
    title: 'Vet visit',
    message: 'Annual checkup',
    dueAt,
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
        RemindersService,
        {
          provide: getModelToken(Reminder.name),
          useValue: reminderModelMock,
        },
        {
          provide: PetOwnershipService,
          useValue: petOwnershipServiceMock,
        },
        {
          provide: getModelToken(Vaccination.name),
          useValue: vaccinationModelMock,
        },
        {
          provide: getModelToken(Medication.name),
          useValue: medicationModelMock,
        },
        {
          provide: getModelToken(Appointment.name),
          useValue: appointmentModelMock,
        },
        {
          provide: getModelToken(Pet.name),
          useValue: petModelMock,
        },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReminder', () => {
    it('creates a reminder for the user pet', async () => {
      const document = buildReminderDocument(petId);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );
      reminderModelMock.create.mockResolvedValue(document);

      const input: CreateReminderInput = {
        petId,
        type: ReminderType.GENERAL,
        title: ' Vet visit ',
        message: ' Annual checkup ',
        dueAt,
      };

      const result = await service.createReminder(ownerId, input);

      expect(
        petOwnershipServiceMock.assertPetBelongsToOwner,
      ).toHaveBeenCalledWith(ownerId, petId, 'Pet not found');
      expect(reminderModelMock.create).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
        type: ReminderType.GENERAL,
        title: 'Vet visit',
        message: 'Annual checkup',
        dueAt,
        status: ReminderStatus.PENDING,
      });
      expect(result.status).toBe(ReminderStatus.PENDING);
    });

    it('stores optional source references together', async () => {
      const document = {
        ...buildReminderDocument(petId),
        sourceType: SourceType.VACCINATION,
        sourceId: new Types.ObjectId(sourceId),
      };
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );
      reminderModelMock.create.mockResolvedValue(document);
      vaccinationModelMock.exists.mockReturnValue(
        existsResult({ _id: new Types.ObjectId(sourceId) }),
      );

      await service.createReminder(ownerId, {
        petId,
        type: ReminderType.VACCINATION,
        title: 'Booster',
        dueAt,
        sourceType: SourceType.VACCINATION,
        sourceId,
      });

      expect(vaccinationModelMock.exists).toHaveBeenCalledWith({
        _id: new Types.ObjectId(sourceId),
        petId: new Types.ObjectId(petId),
      });

      expect(reminderModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: SourceType.VACCINATION,
          sourceId: new Types.ObjectId(sourceId),
        }),
      );
    });

    it('rejects source records that belong to another pet', async () => {
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );
      medicationModelMock.exists.mockReturnValue(existsResult(null));

      await expect(
        service.createReminder(ownerId, {
          petId,
          type: ReminderType.MEDICATION,
          title: 'Pill',
          dueAt,
          sourceType: SourceType.MEDICATION,
          sourceId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(reminderModelMock.create).not.toHaveBeenCalled();
    });

    it('rejects mismatched sourceType and sourceId', async () => {
      await expect(
        service.createReminder(ownerId, {
          petId,
          type: ReminderType.VACCINATION,
          title: 'Booster',
          dueAt,
          sourceType: SourceType.VACCINATION,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('treats another user pet as not found', async () => {
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Pet not found'),
      );

      await expect(
        service.createReminder(otherOwnerId, {
          petId,
          type: ReminderType.GENERAL,
          title: 'Vet visit',
          dueAt,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findRemindersForPet', () => {
    it('lists reminders for the user pet', async () => {
      const document = buildReminderDocument(petId);
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );
      reminderModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([document]),
        }),
      });

      const result = await service.findRemindersForPet(ownerId, petId);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(reminderId);
    });
  });

  describe('findReminderByIdForOwner', () => {
    it('reads a reminder for the user pet', async () => {
      const document = buildReminderDocument(petId);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      const result = await service.findReminderByIdForOwner(
        ownerId,
        reminderId,
      );

      expect(result.id).toBe(reminderId);
    });

    it('prevents reading another user reminder', async () => {
      const document = buildReminderDocument(petId);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockRejectedValue(
        new NotFoundException('Reminder not found'),
      );

      await expect(
        service.findReminderByIdForOwner(otherOwnerId, reminderId),
      ).rejects.toThrow('Reminder not found');
    });
  });

  describe('updateReminder', () => {
    it('updates a reminder for the user pet', async () => {
      const document = buildReminderDocument(petId);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      const result = await service.updateReminder(ownerId, reminderId, {
        title: ' Updated title ',
      });

      expect(document.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated title');
    });

    it('prevents changing petId', async () => {
      await expect(
        service.updateReminder(ownerId, reminderId, {
          title: 'Updated',
          petId: '507f1f77bcf86cd799439099',
        } as UpdateReminderInput & { petId: string }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('prevents changing source references', async () => {
      await expect(
        service.updateReminder(ownerId, reminderId, {
          title: 'Updated',
          sourceType: SourceType.MEDICATION,
        } as UpdateReminderInput & { sourceType: SourceType }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('completeReminder', () => {
    it('completes a pending reminder', async () => {
      const document = buildReminderDocument(petId);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      const result = await service.completeReminder(ownerId, reminderId);

      expect(result.status).toBe(ReminderStatus.COMPLETED);
    });

    it('rejects completing a finalized reminder', async () => {
      const document = buildReminderDocument(petId, ReminderStatus.COMPLETED);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      await expect(
        service.completeReminder(ownerId, reminderId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('dismissReminder', () => {
    it('dismisses a pending reminder', async () => {
      const document = buildReminderDocument(petId);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      const result = await service.dismissReminder(ownerId, reminderId);

      expect(result.status).toBe(ReminderStatus.DISMISSED);
    });

    it('rejects dismissing a finalized reminder', async () => {
      const document = buildReminderDocument(petId, ReminderStatus.DISMISSED);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      await expect(
        service.dismissReminder(ownerId, reminderId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteReminder', () => {
    it('deletes a reminder for the user pet', async () => {
      const document = buildReminderDocument(petId);
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      await expect(service.deleteReminder(ownerId, reminderId)).resolves.toBe(
        true,
      );
      expect(document.deleteOne).toHaveBeenCalled();
    });
  });
  describe('reminders from clinics', () => {
    const clinicReminder = (overrides: Record<string, unknown> = {}) => ({
      ...buildReminderDocument(petId),
      clinicId: 'clinic-1',
      clinicName: 'Paws',
      createdByName: 'Dr Ona',
      ...overrides,
    });

    it('marks who manages each reminder', async () => {
      reminderModelMock.find.mockReturnValue({
        sort: () => ({
          exec: jest
            .fn()
            .mockResolvedValue([
              buildReminderDocument(petId),
              clinicReminder(),
              { ...buildReminderDocument(petId), automatic: true },
            ]),
        }),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      const reminders = await service.findRemindersForPet(ownerId, petId);

      expect(reminders.map((reminder) => reminder.managedBy)).toEqual([
        ReminderManagedBy.OWNER,
        ReminderManagedBy.CLINIC,
        ReminderManagedBy.AUTOMATIC,
      ]);
      expect(reminders[1]).toMatchObject({
        clinicName: 'Paws',
        createdByName: 'Dr Ona',
      });
    });

    it('does not let the owner edit or delete a clinic reminder', async () => {
      const document = clinicReminder();
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      await expect(
        service.updateReminder(ownerId, reminderId, { title: 'Changed' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.deleteReminder(ownerId, reminderId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(document.save).not.toHaveBeenCalled();
      expect(document.deleteOne).not.toHaveBeenCalled();
    });

    it('lets the owner complete a clinic reminder', async () => {
      const document = clinicReminder();
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });
      petOwnershipServiceMock.assertPetBelongsToOwner.mockResolvedValue(
        undefined,
      );

      const result = await service.completeReminder(ownerId, reminderId);

      expect(result.status).toBe(ReminderStatus.COMPLETED);
    });

    it('creates a reminder for an active pet on behalf of a clinic', async () => {
      petModelMock.exists.mockReturnValue(existsResult({ _id: petId }));
      reminderModelMock.create.mockResolvedValue(clinicReminder());

      const result = await service.createForClinic({
        petId,
        type: ReminderType.APPOINTMENT,
        title: 'Follow-up visit',
        dueAt,
        clinicId: 'clinic-1',
        clinicName: 'Paws',
        createdByName: 'Dr Ona',
      });

      expect(reminderModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          petId: new Types.ObjectId(petId),
          clinicId: 'clinic-1',
          status: ReminderStatus.PENDING,
        }),
      );
      expect(result.managedBy).toBe(ReminderManagedBy.CLINIC);
    });

    it('only lets the clinic that set a reminder remove it', async () => {
      const document = clinicReminder();
      reminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(document),
      });

      await expect(
        service.deleteForClinic(reminderId, 'clinic-2', petId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(document.deleteOne).not.toHaveBeenCalled();

      await service.deleteForClinic(reminderId, 'clinic-1', petId);
      expect(document.deleteOne).toHaveBeenCalled();
    });

    it('shows clinics only clinic and automatic reminders', async () => {
      reminderModelMock.find.mockReturnValue({
        sort: () => ({ exec: jest.fn().mockResolvedValue([]) }),
      });

      await service.findClinicVisibleForPet(petId);

      expect(reminderModelMock.find).toHaveBeenCalledWith({
        petId: new Types.ObjectId(petId),
        $or: [{ clinicId: { $exists: true, $ne: null } }, { automatic: true }],
      });
    });
  });
});
