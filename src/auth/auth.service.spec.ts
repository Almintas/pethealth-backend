import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/enums/user-role.enum';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { UpdateNotificationPreferencesInput } from './dto/update-notification-preferences.input';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findByEmail: jest.fn(),
    findByEmailWithPasswordHash: jest.fn(),
    createUser: jest.fn(),
    updateNotificationPreferences: jest.fn(),
  };

  const passwordServiceMock = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  };

  const registeredUser: UserModel = {
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
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: PasswordService,
          useValue: passwordServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const validInput: RegisterInput = {
      email: '  Jane@Example.COM ',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('registers a user with a hashed password', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);
      passwordServiceMock.hash.mockResolvedValue('hashed-password');
      usersServiceMock.createUser.mockResolvedValue(registeredUser);

      const result = await service.register(validInput);

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(passwordServiceMock.hash).toHaveBeenCalledWith('password123');
      expect(usersServiceMock.createUser).toHaveBeenCalledWith({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.USER,
        passwordHash: 'hashed-password',
      });
      expect(result).toEqual(registeredUser);
    });

    it('rejects duplicate emails', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(registeredUser);

      await expect(service.register(validInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(passwordServiceMock.hash).not.toHaveBeenCalled();
      expect(usersServiceMock.createUser).not.toHaveBeenCalled();
    });

    it('rejects passwords shorter than 8 characters', async () => {
      await expect(
        service.register({
          ...validInput,
          password: 'short',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid email addresses', async () => {
      await expect(
        service.register({
          ...validInput,
          email: 'not-an-email',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: '  Jane@Example.COM ',
      password: 'password123',
    };

    it('returns an access token and user for valid credentials', async () => {
      usersServiceMock.findByEmailWithPasswordHash.mockResolvedValue({
        user: registeredUser,
        passwordHash: 'hashed-password',
      });
      passwordServiceMock.compare.mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('signed-jwt');

      const result = await service.login(loginInput);

      expect(usersServiceMock.findByEmailWithPasswordHash).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(passwordServiceMock.compare).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: registeredUser.id,
        role: registeredUser.role,
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: registeredUser,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rejects unknown emails', async () => {
      usersServiceMock.findByEmailWithPasswordHash.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(passwordServiceMock.compare).not.toHaveBeenCalled();
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });

    it('rejects invalid passwords', async () => {
      usersServiceMock.findByEmailWithPasswordHash.mockResolvedValue({
        user: registeredUser,
        passwordHash: 'hashed-password',
      });
      passwordServiceMock.compare.mockResolvedValue(false);

      await expect(service.login(loginInput)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });
  });

  describe('updateNotificationPreferences', () => {
    const input: UpdateNotificationPreferencesInput = {
      emailAppointmentReminders: false,
    };

    it('updates notification preferences for the current user', async () => {
      const updatedUser = {
        ...registeredUser,
        notificationPreferences: {
          ...registeredUser.notificationPreferences,
          emailAppointmentReminders: false,
        },
      };
      usersServiceMock.updateNotificationPreferences.mockResolvedValue(
        updatedUser,
      );

      const result = await service.updateNotificationPreferences(
        registeredUser,
        input,
      );

      expect(
        usersServiceMock.updateNotificationPreferences,
      ).toHaveBeenCalledWith(registeredUser.id, {
        emailAppointmentReminders: false,
      });
      expect(result.notificationPreferences.emailAppointmentReminders).toBe(
        false,
      );
    });
  });
});
