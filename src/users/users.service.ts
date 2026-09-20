import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from './enums/user-role.enum';
import { CreateUserOptions } from './interfaces/create-user-options.interface';
import { UserWithPasswordHash } from './interfaces/user-with-password-hash.interface';
import { NotificationPreferencesModel } from './models/notification-preferences.model';
import { UserModel } from './models/user.model';
import { resolveNotificationPreferences } from './notification-preferences.util';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(
    input: CreateUserDto,
    options: CreateUserOptions = {},
  ): Promise<UserModel> {
    const dto = await this.validateCreateUserInput(input);

    if (!options.allowElevatedRoles) {
      if (dto.role !== UserRole.USER) {
        throw new BadRequestException('Invalid role for user creation');
      }
      dto.role = UserRole.USER;
    }

    try {
      const created = await this.userModel.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        ...(dto.passwordHash !== undefined && {
          passwordHash: dto.passwordHash,
        }),
      });

      return this.toUserModel(created);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('A user with this email already exists');
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .exec();
    return user ? this.toUserModel(user) : null;
  }

  async findByEmailWithPasswordHash(
    email: string,
  ): Promise<UserWithPasswordHash | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .select('+passwordHash')
      .exec();

    if (!user?.passwordHash) {
      return null;
    }

    return {
      user: this.toUserModel(user),
      passwordHash: user.passwordHash,
    };
  }

  async findById(id: string): Promise<UserModel | null> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userModel.findById(id).exec();
    return user ? this.toUserModel(user) : null;
  }

  async findByIdWithPasswordHash(
    id: string,
  ): Promise<UserWithPasswordHash | null> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userModel.findById(id).select('+passwordHash').exec();

    if (!user?.passwordHash) {
      return null;
    }

    return {
      user: this.toUserModel(user),
      passwordHash: user.passwordHash,
    };
  }

  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ): Promise<UserModel> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (updates.email !== undefined) {
      const normalizedEmail = updates.email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new BadRequestException('Email is required');
      }

      if (normalizedEmail !== user.email) {
        const existing = await this.userModel
          .findOne({ email: normalizedEmail })
          .exec();
        if (existing && existing._id.toString() !== userId) {
          throw new ConflictException('A user with this email already exists');
        }
        user.email = normalizedEmail;
      }
    }

    if (updates.firstName !== undefined) {
      user.firstName = updates.firstName;
    }

    if (updates.lastName !== undefined) {
      user.lastName = updates.lastName;
    }

    try {
      await user.save();
      return this.toUserModel(user);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('A user with this email already exists');
      }

      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferencesModel>,
  ): Promise<UserModel> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const current = resolveNotificationPreferences(user.notificationPreferences);

    user.notificationPreferences = {
      emailAppointmentReminders:
        updates.emailAppointmentReminders ?? current.emailAppointmentReminders,
      emailMedicationReminders:
        updates.emailMedicationReminders ?? current.emailMedicationReminders,
      emailVaccinationReminders:
        updates.emailVaccinationReminders ?? current.emailVaccinationReminders,
    };

    await user.save();
    return this.toUserModel(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const result = await this.userModel
      .updateOne({ _id: userId }, { passwordHash })
      .exec();

    if (result.matchedCount === 0) {
      throw new BadRequestException('User not found');
    }
  }

  private async validateCreateUserInput(
    input: CreateUserDto,
  ): Promise<CreateUserDto> {
    const dto = plainToInstance(CreateUserDto, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private toUserModel(document: UserDocument): UserModel {
    return {
      id: document._id.toString(),
      email: document.email,
      firstName: document.firstName,
      lastName: document.lastName,
      role: document.role,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      notificationPreferences: resolveNotificationPreferences(
        document.notificationPreferences,
      ),
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
