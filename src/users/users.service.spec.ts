import { BadRequestException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from './enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserDocument = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: UserRole.USER,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  const userModelMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('creates a user with normalized email', async () => {
      userModelMock.create.mockResolvedValue(mockUserDocument);

      const input: CreateUserDto = {
        email: '  Jane@Example.COM ',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.USER,
      };

      const result = await service.createUser(input);

      expect(userModelMock.create).toHaveBeenCalledWith({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.USER,
      });
      expect(result.id).toBe('507f1f77bcf86cd799439011');
      expect(result.email).toBe('jane@example.com');
    });

    it('rejects invalid email', async () => {
      await expect(
        service.createUser({
          email: 'not-an-email',
          firstName: 'Jane',
          lastName: 'Doe',
          role: UserRole.USER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('maps duplicate email to conflict', async () => {
      userModelMock.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createUser({
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          role: UserRole.USER,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('returns a user when found', async () => {
      userModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDocument),
      });

      const result = await service.findByEmail('JANE@example.com');

      expect(userModelMock.findOne).toHaveBeenCalledWith({
        email: 'jane@example.com',
      });
      expect(result?.email).toBe('jane@example.com');
    });

    it('returns null when not found', async () => {
      userModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findByEmail('missing@example.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findByEmailWithPasswordHash', () => {
    it('returns the user and password hash when found', async () => {
      const documentWithHash = {
        ...mockUserDocument,
        passwordHash: 'hashed-password',
      };

      userModelMock.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(documentWithHash),
        }),
      });

      const result =
        await service.findByEmailWithPasswordHash('JANE@example.com');

      expect(userModelMock.findOne).toHaveBeenCalledWith({
        email: 'jane@example.com',
      });
      expect(result?.passwordHash).toBe('hashed-password');
      expect(result?.user.email).toBe('jane@example.com');
    });

    it('returns null when the user does not exist', async () => {
      userModelMock.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.findByEmailWithPasswordHash('missing@example.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns a user when found', async () => {
      userModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDocument),
      });

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(result?.id).toBe('507f1f77bcf86cd799439011');
    });

    it('rejects invalid id', async () => {
      await expect(service.findById('invalid-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
