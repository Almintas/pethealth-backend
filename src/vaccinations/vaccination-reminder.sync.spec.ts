import { Types } from 'mongoose';
import { ReminderStatus } from '../reminders/enums/reminder-status.enum';
import { ReminderType } from '../reminders/enums/reminder-type.enum';
import { SourceType } from '../reminders/enums/source-type.enum';
import { VaccinationReminderSync } from './vaccination-reminder.sync';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('VaccinationReminderSync', () => {
  const vaccinationId = new Types.ObjectId();
  const petId = new Types.ObjectId();
  const dueAt = new Date('2027-03-12T00:00:00.000Z');
  const reminderModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };
  let sync: VaccinationReminderSync;

  const vaccination = (nextDueAt?: Date) =>
    ({
      _id: vaccinationId,
      petId,
      vaccineName: 'Rabies',
      clinicName: 'Paws',
      nextDueAt,
    }) as never;

  const filter = {
    sourceType: SourceType.VACCINATION,
    sourceId: vaccinationId,
    automatic: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reminderModel.deleteMany.mockReturnValue(execOf({ deletedCount: 1 }));
    sync = new VaccinationReminderSync(reminderModel as never);
  });

  it('creates a vaccination reminder for the next due date', async () => {
    reminderModel.findOne.mockReturnValue(execOf(null));

    await sync.sync(vaccination(dueAt));

    expect(reminderModel.create).toHaveBeenCalledWith({
      ...filter,
      petId,
      type: ReminderType.VACCINATION,
      title: 'Rabies',
      dueAt,
      status: ReminderStatus.PENDING,
      clinicName: 'Paws',
    });
  });

  it('moves the reminder and makes it pending again when the date changes', async () => {
    const existing = {
      dueAt: new Date('2026-03-12T00:00:00.000Z'),
      status: ReminderStatus.COMPLETED,
      title: 'Old',
      clinicName: undefined as string | undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reminderModel.findOne.mockReturnValue(execOf(existing));

    await sync.sync(vaccination(dueAt));

    expect(existing).toMatchObject({
      dueAt,
      status: ReminderStatus.PENDING,
      title: 'Rabies',
      clinicName: 'Paws',
    });
    expect(existing.save).toHaveBeenCalled();
  });

  it('keeps a dismissed reminder dismissed when the date is unchanged', async () => {
    const existing = {
      dueAt: new Date(dueAt),
      status: ReminderStatus.DISMISSED,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reminderModel.findOne.mockReturnValue(execOf(existing));

    await sync.sync(vaccination(dueAt));

    expect(existing.status).toBe(ReminderStatus.DISMISSED);
  });

  it('removes the pending reminder when the due date is cleared', async () => {
    await sync.sync(vaccination(undefined));

    expect(reminderModel.deleteMany).toHaveBeenCalledWith({
      ...filter,
      status: ReminderStatus.PENDING,
    });
    expect(reminderModel.create).not.toHaveBeenCalled();
  });

  it('never throws, so the vaccination is still saved', async () => {
    reminderModel.findOne.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(sync.sync(vaccination(dueAt))).resolves.toBeUndefined();
  });
});
