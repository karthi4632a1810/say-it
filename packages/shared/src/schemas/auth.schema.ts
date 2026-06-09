import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'At least 3 characters')
  .max(32, 'Max 32 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, or underscore only');

export const loginSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(64),
  password: z.string().min(4, 'At least 4 characters'),
  deviceName: z.string().optional(),
});

export const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(4, 'At least 4 characters').max(100),
});

export const checkUsernameSchema = z.object({
  username: usernameSchema,
});

export const mfaVerifySchema = z.object({
  tempToken: z.string(),
  totpCode: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  skills: z.array(z.string()).optional(),
});
