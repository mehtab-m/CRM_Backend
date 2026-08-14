import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const registerBodySchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(1).max(255),
  phone: z.string().max(30).optional(),
});

export const changePasswordBodySchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });


export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});


export const verifyResetOtpBodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const resetPasswordBodySchema = z.object({
  resetToken: z.string().uuid('Invalid reset token'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});



export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type VerifyResetOtpBody = z.infer<typeof verifyResetOtpBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
