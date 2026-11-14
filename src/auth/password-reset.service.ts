import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { EmailService } from '../notifications/email.service';
import { buildPasswordResetEmail } from '../notifications/email-templates';
import { buildFrontendUrl } from '../notifications/frontend-url';
import { UserModel } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { AccountActivationService } from './account-activation/account-activation.service';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Issues single-use emailed tokens that let a user choose a new password.
 * Clinic-created accounts without a password are sent the account activation
 * link instead, so there is a single way to claim such an account.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly accountActivationService: AccountActivationService,
  ) {}

  /** Always resolves; never reveals whether the email exists. */
  async requestPasswordReset(email: string): Promise<void> {
    const account = await this.usersService.findByEmailWithAccountStatus(email);
    if (!account) {
      return;
    }

    if (!account.hasPassword) {
      await this.accountActivationService.sendActivationEmailIfUnclaimed(
        account.user.email,
      );
      return;
    }

    await this.sendResetEmail(account.user);
  }

  private async sendResetEmail(user: UserModel): Promise<void> {
    const token = randomBytes(32).toString('base64url');

    await this.usersService.setPasswordResetToken(
      user.id,
      hashPasswordResetToken(token),
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );

    const userName = `${user.firstName} ${user.lastName}`.trim() || 'there';
    const resetUrl = buildFrontendUrl(
      this.configService,
      `/reset-password?token=${encodeURIComponent(token)}`,
    );

    const result = await this.emailService.send({
      to: user.email,
      ...buildPasswordResetEmail({
        userName,
        resetUrl,
        expiresInLabel: '1 hour',
      }),
    });
    if (!result.ok) {
      this.logger.warn(
        `Password reset email could not be sent: ${result.errorMessage}`,
      );
    }
  }
}
