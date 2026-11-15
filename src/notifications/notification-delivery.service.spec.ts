import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel } from './enums/notification-channel.enum';
import { NotificationDeliveryStatus } from './enums/notification-delivery-status.enum';
import { NotificationType } from './enums/notification-type.enum';
import {
  buildDeliveryKey,
  NotificationDeliveryService,
} from './notification-delivery.service';
import { NotificationDelivery } from './schemas/notification-delivery.schema';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;

  const deliveryModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const baseParams = {
    deliveryKey: 'key',
    channel: NotificationChannel.EMAIL,
    notificationType: NotificationType.MEDICATION_REMINDER,
    userId: '507f1f77bcf86cd799439011',
    scheduledFor: new Date(),
  };

  function mockExisting(record: Record<string, unknown>): void {
    deliveryModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'delivery-id', ...record }),
    });
  }

  function mockClaim(result: unknown): void {
    deliveryModelMock.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(result),
    });
  }

  const minutesAgo = (minutes: number): Date =>
    new Date(Date.now() - minutes * 60 * 1000);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        {
          provide: getModelToken(NotificationDelivery.name),
          useValue: deliveryModelMock,
        },
      ],
    }).compile();

    service = module.get(NotificationDeliveryService);
  });

  it('skips when delivery already sent', async () => {
    deliveryModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        status: NotificationDeliveryStatus.SENT,
      }),
    });

    const result = await service.tryBeginDelivery({
      deliveryKey: 'key',
      channel: NotificationChannel.EMAIL,
      notificationType: NotificationType.MEDICATION_REMINDER,
      userId: '507f1f77bcf86cd799439011',
      scheduledFor: new Date(),
    });

    expect(result).toBe('skip');
    expect(deliveryModelMock.create).not.toHaveBeenCalled();
  });

  it('does not resend while a recent delivery is still pending', async () => {
    mockExisting({
      status: NotificationDeliveryStatus.PENDING,
      attemptCount: 1,
      updatedAt: minutesAgo(5),
    });

    await expect(service.tryBeginDelivery(baseParams)).resolves.toBe('skip');
    expect(deliveryModelMock.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('retries a stale pending delivery by claiming it atomically', async () => {
    mockExisting({
      status: NotificationDeliveryStatus.PENDING,
      attemptCount: 1,
      updatedAt: minutesAgo(45),
    });
    mockClaim({ _id: 'delivery-id' });

    await expect(service.tryBeginDelivery(baseParams)).resolves.toBe('send');
    expect(deliveryModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: 'delivery-id',
        status: NotificationDeliveryStatus.PENDING,
        attemptCount: 1,
      },
      expect.objectContaining({ $inc: { attemptCount: 1 } }),
      { new: true },
    );
  });

  it('skips a failed delivery retried too soon', async () => {
    mockExisting({
      status: NotificationDeliveryStatus.FAILED,
      attemptCount: 1,
      updatedAt: minutesAgo(10),
    });

    await expect(service.tryBeginDelivery(baseParams)).resolves.toBe('skip');
  });

  it('skips when the attempt limit is reached', async () => {
    mockExisting({
      status: NotificationDeliveryStatus.FAILED,
      attemptCount: 8,
      updatedAt: minutesAgo(600),
    });

    await expect(service.tryBeginDelivery(baseParams)).resolves.toBe('skip');
  });

  it('skips when another worker claimed the delivery first', async () => {
    mockExisting({
      status: NotificationDeliveryStatus.FAILED,
      attemptCount: 2,
      updatedAt: minutesAgo(120),
    });
    mockClaim(null);

    await expect(service.tryBeginDelivery(baseParams)).resolves.toBe('skip');
  });

  it('builds stable delivery keys', () => {
    const date = new Date('2026-09-25T12:00:00.000Z');
    const key = buildDeliveryKey(
      NotificationChannel.EMAIL,
      NotificationType.APPOINTMENT_REMINDER_24H,
      'abc123',
      date,
    );

    expect(key).toBe(
      'EMAIL:APPOINTMENT_REMINDER_24H:abc123:2026-09-25T12:00:00.000Z',
    );
  });
});
