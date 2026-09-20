import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../users/enums/user-role.enum';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { ChangePasswordInput } from './dto/change-password.input';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { UpdateProfileInput } from './dto/update-profile.input';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthPayload } from './models/auth-payload.model';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<UserModel> {
    const dto = await this.validateRegisterInput(input);

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    return this.usersService.createUser({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.USER,
      passwordHash,
    });
  }

  async login(input: LoginInput): Promise<AuthPayload> {
    const dto = await this.validateLoginInput(input);
    const authRecord = await this.usersService.findByEmailWithPasswordHash(
      dto.email,
    );

    if (!authRecord) {
      this.logger.warn('Failed login attempt (user not found)');
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.compare(
      dto.password,
      authRecord.passwordHash,
    );

    if (!passwordMatches) {
      this.logger.warn('Failed login attempt (invalid password)');
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: authRecord.user.id,
      role: authRecord.user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: authRecord.user,
    };
  }

  async updateProfile(
    currentUser: UserModel,
    input: UpdateProfileInput,
  ): Promise<UserModel> {
    const dto = await this.validateUpdateProfileInput(input);

    if (
      dto.firstName === undefined &&
      dto.lastName === undefined &&
      dto.email === undefined
    ) {
      throw new BadRequestException('No profile fields to update');
    }

    return this.usersService.updateProfile(currentUser.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });
  }

  async changePassword(
    currentUser: UserModel,
    input: ChangePasswordInput,
  ): Promise<boolean> {
    const dto = await this.validateChangePasswordInput(input);

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const authRecord = await this.usersService.findByIdWithPasswordHash(
      currentUser.id,
    );

    if (!authRecord) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.compare(
      dto.currentPassword,
      authRecord.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.usersService.updatePasswordHash(currentUser.id, passwordHash);

    return true;
  }

  private async validateUpdateProfileInput(
    input: UpdateProfileInput,
  ): Promise<UpdateProfileInput> {
    const dto = plainToInstance(UpdateProfileInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateChangePasswordInput(
    input: ChangePasswordInput,
  ): Promise<ChangePasswordInput> {
    const dto = plainToInstance(ChangePasswordInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateRegisterInput(
    input: RegisterInput,
  ): Promise<RegisterInput> {
    const dto = plainToInstance(RegisterInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private async validateLoginInput(input: LoginInput): Promise<LoginInput> {
    const dto = plainToInstance(LoginInput, input, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }
}
