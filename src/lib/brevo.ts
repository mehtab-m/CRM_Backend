import { BrevoClient } from '@getbrevo/brevo';
import { env } from '../config/env.js';

const brevo = new BrevoClient({
  apiKey: env.BREVO_API_KEY,
});

export async function sendPasswordResetOtp(
  recipientEmail: string,
  otp: string,
): Promise<void> {
  await brevo.transactionalEmails.sendTransacEmail({
    sender: {
      email: env.BREVO_SENDER_EMAIL,
      name: env.BREVO_SENDER_NAME,
    },
    to: [
      {
        email: recipientEmail,
      },
    ],
    subject: 'Your WhatsApp CRM Password Reset OTP',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>

        <p>You requested to reset your WhatsApp CRM password.</p>

        <p>Your verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 16px;
          background: #f3f4f6;
          text-align: center;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>This code will expire in <strong>10 minutes</strong>.</p>

        <p>
          If you did not request a password reset, you can safely ignore this email.
        </p>

        <p>Regards,<br />WhatsApp CRM Team</p>
      </div>
    `,
  });
}