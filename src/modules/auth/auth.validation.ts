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

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
