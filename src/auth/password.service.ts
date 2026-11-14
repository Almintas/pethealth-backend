import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 10;

  /**
   * Pre-computed hash used to keep login timing constant when the account
   * does not exist, so response times cannot be used to enumerate emails.
   */
  private dummyHashPromise?: Promise<string>;

  async hash(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, this.saltRounds);
  }

  async compare(
    plainTextPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, passwordHash);
  }

  /** Performs a throw-away comparison with the same cost as a real one. */
  async compareAgainstDummy(plainTextPassword: string): Promise<void> {
    this.dummyHashPromise ??= bcrypt.hash(
      'pethealth-dummy-password',
      this.saltRounds,
    );
    await bcrypt.compare(plainTextPassword, await this.dummyHashPromise);
  }
}
