import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/enums/user-role.enum';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const usersServiceMock = {
    findAuthStateById: jest.fn(),
  };

  const user: UserModel = {
    id: '507f1f77bcf86cd799439011',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: UserRole.USER,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    notificationPreferences: {
      emailAppointmentReminders: true,
      emailMedicationReminders: true,
      emailVaccinationReminders: true,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string): string => {
              if (key === 'JWT_SECRET') {
                return 'test-secret';
              }
              throw new Error(`Unexpected config key: ${key}`);
            },
          },
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('returns the authenticated user for a valid payload', async () => {
    usersServiceMock.findAuthStateById.mockResolvedValue({
      user,
      tokenVersion: 0,
    });

    await expect(
      strategy.validate({ sub: user.id, role: user.role }),
    ).resolves.toEqual(user);
    expect(usersServiceMock.findAuthStateById).toHaveBeenCalledWith(user.id);
  });

  it('accepts tokens carrying the current token version', async () => {
    usersServiceMock.findAuthStateById.mockResolvedValue({
      user,
      tokenVersion: 2,
    });

    await expect(
      strategy.validate({ sub: user.id, role: user.role, tv: 2 }),
    ).resolves.toEqual(user);
  });

  it('rejects tokens issued before the password changed', async () => {
    usersServiceMock.findAuthStateById.mockResolvedValue({
      user,
      tokenVersion: 1,
    });

    await expect(
      strategy.validate({ sub: user.id, role: user.role }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      strategy.validate({ sub: user.id, role: user.role, tv: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens when the user no longer exists', async () => {
    usersServiceMock.findAuthStateById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: user.id, role: user.role }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
