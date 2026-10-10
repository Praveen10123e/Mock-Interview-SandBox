import { describe, it, expect, vi, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';
import { EmailService } from '../EmailService';
import { TokenService } from '../TokenService';

vi.mock('nodemailer');

describe('EmailService & OTP Verification Flow', () => {
  let emailService: EmailService;
  let sendMailMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_HOST = 'smtp.gmail.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test-sandbox@gmail.com';
    process.env.EMAIL_PASSWORD = 'app-password-mock';
    process.env.EMAIL_FROM = 'NM Sandbox <test-sandbox@gmail.com>';

    sendMailMock = vi.fn().mockResolvedValue({ messageId: 'msg-12345' });
    (nodemailer.createTransport as any) = vi.fn().mockReturnValue({
      sendMail: sendMailMock,
    });

    emailService = new EmailService();
  });

  it('should deliver real password reset OTP email with correct subject and format', async () => {
    await emailService.sendPasswordResetOtpEmail('student@example.com', '654321');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailOptions = sendMailMock.mock.calls[0][0];

    expect(mailOptions.to).toBe('student@example.com');
    expect(mailOptions.subject).toBe('NM Sandbox - Password Reset Verification Code');
    expect(mailOptions.text).toContain('654321');
    expect(mailOptions.text).toContain('This code expires in 5 minutes.');
    expect(mailOptions.html).toContain('654321');
    expect(mailOptions.html).toContain('NM Sandbox');
  });

  it('should fail if SMTP credentials are not configured', async () => {
    const unconfiguredEmailService = new EmailService();
    // Prevent reloadEnv from restoring disk .env in test
    (unconfiguredEmailService as any).reloadEnv = vi.fn(() => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
    });

    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASSWORD;

    await expect(
      unconfiguredEmailService.sendPasswordResetOtpEmail('student@example.com', '654321')
    ).rejects.toThrow('Unable to send verification code. Please try again.');
  });

  it('should fail and log if transporter.sendMail throws an error', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP connection refused'));

    await expect(
      emailService.sendPasswordResetOtpEmail('student@example.com', '654321')
    ).rejects.toThrow('Unable to send verification code. Please try again.');
  });

  it('should generate and verify password reset JWT tokens securely', () => {
    const tokenService = new TokenService();
    const token = tokenService.generatePasswordResetJwt('identity-uuid-1', 'student@example.com');
    expect(token).toBeDefined();

    const decoded = tokenService.verifyPasswordResetJwt(token);
    expect(decoded.sub).toBe('identity-uuid-1');
    expect(decoded.email).toBe('student@example.com');
    expect(decoded.purpose).toBe('PASSWORD_RESET');
  });
});
