import { BaseService } from '@nm/api-base';
import { IEmailProvider } from '../interfaces/IEmailProvider';

export class EmailVerificationService extends BaseService {
  constructor(private emailProvider: IEmailProvider) {
    super('EmailVerificationService');
  }

  public async triggerVerification(email: string, token: string) {
    this.logger.info(`Triggering verification for ${email}`);
    await this.emailProvider.sendVerificationEmail(email, token);
  }
}
