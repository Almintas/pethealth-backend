import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AccountActivationService } from './account-activation/account-activation.service';
import {
  AccountActivationToken,
  AccountActivationTokenSchema,
} from './account-activation/schemas/account-activation-token.schema';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PasswordService } from './password.service';

const defaultJwtExpiresIn = '1d' as const;

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    MongooseModule.forFeature([
      {
        name: AccountActivationToken.name,
        schema: AccountActivationTokenSchema,
      },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            defaultJwtExpiresIn) as StringValue,
        },
      }),
    }),
  ],
  providers: [
    AuthResolver,
    AuthService,
    PasswordService,
    JwtStrategy,
    RolesGuard,
    AccountActivationService,
  ],
  exports: [PassportModule, JwtModule, RolesGuard, AccountActivationService],
})
export class AuthModule {}
