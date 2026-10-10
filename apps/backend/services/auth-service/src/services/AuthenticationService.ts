import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BaseService } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';
import { IdentityRepository } from '../repositories/IdentityRepository';
import { TokenRepository } from '../repositories/TokenRepository';
import { TokenService } from './TokenService';
import { SessionService } from './SessionService';
import { EmailService } from './EmailService';
import { IdentityStatus } from '../generated/client';

export class AuthenticationService extends BaseService {
  private identityRepo: IdentityRepository;
  private tokenRepo: TokenRepository;
  private tokenService: TokenService;
  private sessionService: SessionService;
  private emailService: EmailService;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super('AuthenticationService');
    this.identityRepo = new IdentityRepository();
    this.tokenRepo = new TokenRepository();
    this.tokenService = new TokenService();
    this.sessionService = new SessionService();
    this.emailService = new EmailService();
  }

  public async verifyCredentials(email: string, plainText: string) {
    const identity = await this.identityRepo.findByEmail(email);
    if (!identity) {
      throw ErrorFactory.unauthenticated('Invalid email or password');
    }

    if (identity.status === IdentityStatus.LOCKED) {
      if (identity.lockedUntil && identity.lockedUntil > new Date()) {
        throw ErrorFactory.unauthorized('Account is locked due to too many failed attempts.');
      } else {
        // Lock expired, reset
        await this.identityRepo.update(identity.id, {
          status: IdentityStatus.ACTIVE,
          failedLoginAttempts: 0,
          lockedUntil: null,
        });
        identity.status = IdentityStatus.ACTIVE;
      }
    } else if (identity.status !== IdentityStatus.ACTIVE) {
      throw ErrorFactory.unauthorized(`Account status is ${identity.status}`);
    }

    const isValid = await bcrypt.compare(plainText, identity.passwordHash);

    if (!isValid) {
      const attempts = identity.failedLoginAttempts + 1;
      const isLocked = attempts >= this.MAX_FAILED_ATTEMPTS;

      await this.identityRepo.update(identity.id, {
        failedLoginAttempts: attempts,
        status: isLocked ? IdentityStatus.LOCKED : identity.status,
        lockedUntil: isLocked ? new Date(Date.now() + this.LOCKOUT_DURATION_MS) : null,
      });

      throw ErrorFactory.unauthenticated('Invalid email or password');
    }

    // Reset failed attempts on success
    if (identity.failedLoginAttempts > 0) {
      await this.identityRepo.update(identity.id, { failedLoginAttempts: 0 });
    }

    return identity;
  }

  public async changePassword(
    identityId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) {
    if (!identityId) {
      throw ErrorFactory.unauthorized('Authentication required');
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw ErrorFactory.validation('Current password, new password, and confirmation are required');
    }

    if (newPassword !== confirmPassword) {
      throw ErrorFactory.validation('New password and confirmation password do not match');
    }

    if (newPassword.length < 8) {
      throw ErrorFactory.validation('New password must be at least 8 characters long');
    }

    const identity = await this.identityRepo.findById(identityId);
    if (!identity) {
      throw ErrorFactory.notFound('User identity not found');
    }

    const isValid = await bcrypt.compare(currentPassword, identity.passwordHash);
    if (!isValid) {
      throw ErrorFactory.unauthorized('Incorrect current password');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.identityRepo.update(identity.id, { passwordHash });

    return { message: 'Password updated successfully' };
  }

  public async sendPasswordResetOtp(email: string) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw ErrorFactory.validation('Email address is required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw ErrorFactory.validation('Please provide a valid email address');
    }

    console.log(`[OTP] Request received for: ${normalizedEmail}`);
    this.logger.info(`[OTP] Request received for: ${normalizedEmail}`);

    const identity = await this.identityRepo.findByEmail(normalizedEmail);
    if (!identity) {
      throw ErrorFactory.notFound("We couldn't find an account with that email.");
    }

    // Generate secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    console.log('[OTP] OTP generated');
    this.logger.info('[OTP] OTP generated');

    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS);

    // Invalidate prior OTPs
    await this.tokenRepo.deletePasswordResetTokensForIdentity(identity.id);

    // Store hashed token
    await this.tokenRepo.createPasswordResetToken(identity.id, tokenHash, expiresAt);
    console.log('[OTP] OTP stored');
    this.logger.info('[OTP] OTP stored');

    // Deliver real email via SMTP and await provider confirmation
    await this.emailService.sendPasswordResetOtpEmail(normalizedEmail, otp);

    // Masked email for display (e.g., p***@example.com)
    const [name, domain] = normalizedEmail.split('@');
    const maskedEmail = `${name ? name[0] : ''}***@${domain || ''}`;

    return {
      email: maskedEmail,
      expiresInSeconds: 300,
    };
  }

  public async verifyPasswordResetOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw ErrorFactory.validation('Email and verification code are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      throw ErrorFactory.validation('Verification code must be 6 digits');
    }

    const identity = await this.identityRepo.findByEmail(normalizedEmail);
    if (!identity) {
      throw ErrorFactory.notFound("We couldn't find an account with that email.");
    }

    const tokenHash = crypto.createHash('sha256').update(normalizedOtp).digest('hex');
    const resetRecord = await this.tokenRepo.findPasswordResetToken(identity.id, tokenHash);

    if (!resetRecord) {
      throw ErrorFactory.validation('Invalid verification code.');
    }

    if (resetRecord.expiresAt < new Date()) {
      await this.tokenRepo.deletePasswordResetTokenById(resetRecord.id);
      throw ErrorFactory.validation('This verification code has expired. Please request a new code.');
    }

    // Burn OTP immediately (one-time use)
    await this.tokenRepo.deletePasswordResetTokenById(resetRecord.id);

    // Generate signed reset authorization JWT
    const resetToken = this.tokenService.generatePasswordResetJwt(identity.id, identity.email);

    return {
      resetToken,
    };
  }

  public async resetPasswordWithToken(
    resetToken: string,
    newPassword: string,
    confirmPassword: string
  ) {
    if (!resetToken) {
      throw ErrorFactory.unauthorized('Password reset authorization token is required');
    }

    if (!newPassword || !confirmPassword) {
      throw ErrorFactory.validation('New password and confirmation are required');
    }

    if (newPassword !== confirmPassword) {
      throw ErrorFactory.validation('Passwords do not match.');
    }

    if (newPassword.length < 8) {
      throw ErrorFactory.validation('New password must be at least 8 characters long');
    }

    let payload: { sub: string; email: string; purpose: string };
    try {
      payload = this.tokenService.verifyPasswordResetJwt(resetToken);
    } catch (err: any) {
      throw ErrorFactory.unauthorized('This password reset session has expired. Please request a new OTP.');
    }

    const identity = await this.identityRepo.findById(payload.sub);
    if (!identity) {
      throw ErrorFactory.notFound('User account not found');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear lockouts
    await this.identityRepo.update(identity.id, {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: identity.status === IdentityStatus.LOCKED ? IdentityStatus.ACTIVE : identity.status,
    });

    // Invalidate existing sessions for security
    await this.sessionService.revokeAllUserSessions(identity.id);

    return {
      message: 'Password updated successfully',
    };
  }

  public async deleteAccount(identityId: string) {
    if (!identityId) {
      throw ErrorFactory.unauthorized('Authentication required');
    }

    const identity = await this.identityRepo.findById(identityId);
    if (!identity) {
      throw ErrorFactory.notFound('User identity not found');
    }

    // Soft delete strategy to prevent cascading deletion breaks across independent microservice databases
    await this.identityRepo.update(identity.id, {
      status: IdentityStatus.INACTIVE,
    });

    return { message: 'Account deleted successfully' };
  }
}
