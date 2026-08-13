import { z } from '@buying-bot/validation';

export const registerBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(10).max(200),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
  realm: z.enum(['customer', 'admin']).default('customer'),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email().max(320),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().trim().min(20).max(500),
  password: z.string().min(10).max(200),
});

export const verifyEmailBodySchema = z.object({
  token: z.string().trim().min(20).max(500),
});

export const mfaConfirmBodySchema = z.object({
  code: z.string().trim().min(6).max(12),
});

export const mfaChallengeBodySchema = z.object({
  code: z.string().trim().min(6).max(64),
});

export const stepUpBodySchema = z.object({
  password: z.string().min(1).max(200).optional(),
  totp: z.string().trim().min(6).max(12).optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type MfaConfirmBody = z.infer<typeof mfaConfirmBodySchema>;
export type MfaChallengeBody = z.infer<typeof mfaChallengeBodySchema>;
export type StepUpBody = z.infer<typeof stepUpBodySchema>;
