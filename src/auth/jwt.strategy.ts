import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserModel> {
    const authState = await this.usersService.findAuthStateById(payload.sub);

    if (!authState) {
      this.logger.warn('JWT authentication failed (user no longer exists)');
      throw new UnauthorizedException();
    }

    if ((payload.tv ?? 0) !== authState.tokenVersion) {
      this.logger.warn('JWT authentication failed (token revoked)');
      throw new UnauthorizedException();
    }

    return authState.user;
  }
}
