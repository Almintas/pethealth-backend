import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

@Module({
  imports: [UsersModule],
  providers: [AuthResolver, AuthService, PasswordService],
})
export class AuthModule {}
