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
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
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
