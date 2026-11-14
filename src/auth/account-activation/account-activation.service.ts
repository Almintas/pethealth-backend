import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { isProductionEnvironment } from '../../config/environment.util';
import { buildAccountActivationEmail } from '../../notifications/email-templates';
import { EmailService } from '../../notifications/email.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthPayload } from '../models/auth-payload.model';
import { PasswordService } from '../password.service';
import {
  AccountActivationToken,
  AccountActivationTokenDocument,
} from './schemas/account-activation-token.schema';

/**
 * Lets people whose pets were registered by a veterinary clinic take over the
 * placeholder account the clinic created. Ownership of the email address is
 * proven by a one-time link sent to it.
 */
@Injectable()
export class AccountActivationService {
  static readonly TOKEN_TTL_MS = 72 * 60 * 60 * 1000;
  static readonly RESEND_COOLDOWN_MS = 2 * 60 * 1000;

  static readonly INVALID_TOKEN_MESSAGE =
    'This activation link is invalid or has expired. Request a new one.';
  static readonly ALREADY_ACTIVE_MESSAGE =
    'This account is already active. Sign in instead.';

  private readonly logger = new Logger(AccountActivationService.name);

  constructor(
    @InjectModel(AccountActivationToken.name)
    private readonly tokenModel: Model<AccountActivationTokenDocument>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sends an activation email when the address belongs to an unclaimed
   * placeholder owner account. Never throws; returns whether the account is an
   * unclaimed placeholder (regardless of email delivery).
   */
  async sendActivationEmailIfUnclaimed(
    email: string,
    clinicName?: string,
  ): Promise<boolean> {
    try {
      const account = await this.usersService.findAccountStateByEmail(email);
      if (
        !account ||
        account.isClaimed ||
        account.user.role !== UserRole.USER
      ) {
        return false;
      }

      const userObjectId = new Types.ObjectId(account.user.id);
      const recent = await this.tokenModel
        .findOne({
          userId: userObjectId,
          usedAt: null,
          createdAt: {
            $gt: new Date(
              Date.now() - AccountActivationService.RESEND_COOLDOWN_MS,
            ),
          },
        })
        .exec();
      if (recent) {
        return true;
      }

      const token = randomBytes(32).toString('base64url');
      await this.tokenModel.create({
        userId: userObjectId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + AccountActivationService.TOKEN_TTL_MS),
        usedAt: null,
      });

      const frontendUrl = (
        this.configService.get<string>('FRONTEND_URL') ?? ''
      ).replace(/\/+$/, '');
      const activationUrl = `${frontendUrl}/activate-account?token=${encodeURIComponent(token)}`;
      const message = buildAccountActivationEmail({
        firstName: account.user.firstName,
        activationUrl,
        clinicName,
      });
      this.logDevelopmentActivationLink(account.user.email, activationUrl);
      const result = await this.emailService.send({
        to: account.user.email,
        ...message,
      });
      if (!result.ok) {
        this.logger.warn(
          `Activation email could not be sent: ${result.errorMessage}`,
        );
      }
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to prepare activation email: ${message}`);
      return false;
    }
  }

  /**
   * Local development usually has no email provider, which would make
   * clinic-created accounts impossible to activate. Outside production, log
   * the link instead when email is not configured.
   */
  private logDevelopmentActivationLink(
    email: string,
    activationUrl: string,
  ): void {
    if (
      this.emailService.isConfigured() ||
      isProductionEnvironment(this.configService.get<string>('NODE_ENV'))
    ) {
      return;
    }
    this.logger.log(
      `Email is not configured; activation link for ${email}: ${activationUrl}`,
    );
  }

  async activate(token: string, password: string): Promise<AuthPayload> {
    const now = new Date();
    const record = await this.tokenModel
      .findOneAndUpdate(
        {
          tokenHash: this.hashToken(token.trim()),
          usedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { new: true },
      )
      .exec();
    if (!record) {
      throw new BadRequestException(
        AccountActivationService.INVALID_TOKEN_MESSAGE,
      );
    }

    const userId = record.userId.toString();
    const passwordHash = await this.passwordService.hash(password);
    const claimed = await this.usersService.setPasswordHashIfUnclaimed(
      userId,
      passwordHash,
    );
    if (!claimed) {
      throw new BadRequestException(
        AccountActivationService.ALREADY_ACTIVE_MESSAGE,
      );
    }

    await this.tokenModel
      .deleteMany({ userId: record.userId, usedAt: null })
      .exec();

    const authState = await this.usersService.findAuthStateById(userId);
    if (!authState) {
      throw new BadRequestException(
        AccountActivationService.INVALID_TOKEN_MESSAGE,
      );
    }

    const { user, tokenVersion } = authState;
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tv: tokenVersion,
    };
    return { accessToken: this.jwtService.sign(payload), user };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
