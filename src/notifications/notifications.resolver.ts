import { ForbiddenException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserModel } from '../users/models/user.model';
import { NotificationEmailDispatcher } from './notification-email.dispatcher';

@Resolver()
export class NotificationsResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly notificationEmailDispatcher: NotificationEmailDispatcher,
  ) {}

  @Mutation(() => Boolean, {
    name: 'sendTestNotificationEmail',
    description:
      'Development-only: send a test email to the authenticated user',
  })
  @UseGuards(GqlAuthGuard)
  async sendTestNotificationEmail(
    @CurrentUser() user: UserModel,
  ): Promise<boolean> {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    const devFlag =
      this.configService.get<string>('ENABLE_DEV_EMAIL_TEST') === 'true';

    if (nodeEnv === 'production' || !devFlag) {
      throw new ForbiddenException('Test email is not available.');
    }

    return this.notificationEmailDispatcher.sendTestEmailToUser(user.id);
  }
}
