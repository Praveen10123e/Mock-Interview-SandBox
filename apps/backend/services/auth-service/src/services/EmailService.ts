import dns from 'dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { BaseService } from '@nm/api-base';
import { ErrorFactory } from '@nm/errors';

export class EmailService extends BaseService {
  private transporter: Transporter | null = null;
  private lastLoadedConfig: string = '';

  constructor() {
    super('EmailService');
  }

  /**
   * Refreshes environment variables from .env files so live edits are immediately active.
   */
  private reloadEnv(): void {
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'apps/backend/services/auth-service/.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../../../../.env'),
    ];

    for (const p of envPaths) {
      try {
        dotenv.config({ path: p, override: true });
      } catch {
        // Ignore unreadable paths
      }
    }
  }

  /**
   * Retrieves or initializes the Nodemailer SMTP transporter.
   */
  private getTransporter(): Transporter {
    this.reloadEnv();

    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = (process.env.EMAIL_USER || '').trim();
    // Normalize app passwords by removing spaces (e.g. 'abcd efgh ijkl mnop' -> 'abcdefghijklmnop')
    const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');
    const isSecure = process.env.EMAIL_SECURE === 'true' || port === 465;

    const configKey = `${host}:${port}:${user}:${pass}:${isSecure}`;

    if (this.transporter && this.lastLoadedConfig === configKey) {
      return this.transporter;
    }

    if (!user || !pass) {
      this.logger.error('[EMAIL] Missing EMAIL_USER or EMAIL_PASSWORD environment variables.');
    }

    this.lastLoadedConfig = configKey;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
    });

    return this.transporter;
  }

  /**
   * Sends the 6-digit password reset verification OTP to the user's email.
   * Awaits confirmation from the SMTP provider before returning.
   */
  public async sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
    this.reloadEnv();

    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');

    if (!user || !pass) {
      console.error('[EMAIL] Failed to send OTP: SMTP credentials (EMAIL_USER / EMAIL_PASSWORD) not configured in .env file.');
      this.logger.error('[EMAIL] Failed to send OTP: SMTP credentials missing in .env');
      throw ErrorFactory.internal('Unable to send verification code. Please try again.');
    }

    const fromAddress = process.env.EMAIL_FROM || `NM Sandbox <${user}>`;
    const subject = 'NM Sandbox - Password Reset Verification Code';

    const textContent = `Hello,

We received a request to reset your NM Sandbox password.

Your verification code is:

${otp}

This code expires in 5 minutes.

If you did not request a password reset, you can safely ignore this email.

Regards,
NM Sandbox
Technical Interview & Assessment Platform`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NM Sandbox - Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1015; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #181920; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
                    <span style="color: #818cf8; font-size: 18px; font-weight: bold;">NM</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="font-size: 14px; font-weight: bold; letter-spacing: 0.05em; color: #ffffff; text-transform: uppercase;">NM Sandbox</div>
                    <div style="font-size: 11px; color: #a1a1aa;">Technical Interview & Assessment</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Password Reset Verification</h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                Hello,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                We received a request to reset your NM Sandbox password. Use the verification code below to proceed:
              </p>

              <!-- OTP Code Display Card -->
              <div style="margin: 28px 0; padding: 20px; background-color: #0f1015; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; margin-bottom: 8px;">Your Verification Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; padding-left: 8px;">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #71717a; margin-top: 8px;">
                  This code expires in <strong>5 minutes</strong>.
                </div>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 28px 0 20px 0;" />

              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                Regards,<br>
                <strong style="color: #a1a1aa;">NM Sandbox Team</strong><br>
                Technical Interview & Assessment Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    console.log('[EMAIL] Sending verification email...');
    this.logger.info(`[EMAIL] Sending verification email to ${to}...`);

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log('[EMAIL] Email accepted successfully');
      this.logger.info(`[EMAIL] Email accepted successfully with messageId: ${info.messageId}`);
    } catch (error: any) {
      console.error('[EMAIL] Failed to send OTP:', error?.message || error);
      this.logger.error(`[EMAIL] Failed to send OTP: ${error?.message || error}`);
      throw ErrorFactory.internal('Unable to send verification code. Please try again.');
    }
  }
}
