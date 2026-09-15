import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../users/enums/user-role.enum';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { RegisterInput } from './dto/register.input';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
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
}
