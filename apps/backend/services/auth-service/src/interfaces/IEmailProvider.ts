export interface IEmailProvider {
  sendVerificationEmail(to: string, verificationToken: string): Promise<void>;
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
  sendWelcomeEmail(to: string, role: string): Promise<void>;
}
