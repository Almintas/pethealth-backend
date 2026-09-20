import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationEmailDispatcher } from './notification-email.dispatcher';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private running = false;

  constructor(
    private readonly notificationEmailDispatcher: NotificationEmailDispatcher,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleScheduledNotifications(): Promise<void> {
    if (this.running) {
      this.logger.debug('Notification scheduler already running; skipping tick.');
      return;
    }

    this.running = true;
    try {
      await this.notificationEmailDispatcher.processDueNotifications();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';
      this.logger.error(`Notification scheduler tick failed: ${message}`);
    } finally {
      this.running = false;
    }
  }
}
