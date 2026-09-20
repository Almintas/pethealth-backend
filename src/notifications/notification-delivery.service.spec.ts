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
  };

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
