import { z } from 'zod';

// ── Auth Schemas ───────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Please enter your password'),
});

export const SignupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address'),
  phone: z.string().trim().min(6, 'Please enter a valid phone number').max(25),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['ADMIN', 'USER']).optional().default('ADMIN'),
  officeName: z.string().trim().min(2, 'Please enter an office name').optional(),
  officeCodeOrName: z.string().trim().min(2).optional(),
  defaultPreference: z.enum(['flexible', 'always-veg', 'always-non-veg']).default('flexible'),
});

export const JoinOfficeSchema = z.object({
  joinCode: z.string().trim().min(3, 'Invalid join code format').max(32),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address'),
  phone: z.string().trim().min(6, 'Phone number must be at least 6 digits'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  defaultPreference: z.enum(['flexible', 'always-veg', 'always-non-veg']).default('flexible'),
});

// ── Meal Schemas ───────────────────────────────────────────────────────
export const MealConfirmSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  mealType: z.enum(['veg', 'non-veg', 'skip']),
  officeId: z.string().optional(),
});

// ── Office Settings Schemas ───────────────────────────────────────────
export const OfficeSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  vegPrice: z.number().int().positive('Veg price must be greater than 0'),
  nonVegPrice: z.number().int().positive('Non-veg price must be greater than 0'),
  cutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Cutoff time must be HH:MM format (24h)'),
  autoDefaultEnabled: z.boolean().default(true),
  workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  timezone: z.string().default('Asia/Kolkata'),
});

export const CutoffOverrideSchema = z.object({
  officeId: z.string(),
  newCutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Cutoff time must be HH:MM format (24h)'),
  reason: z.string().max(200).optional(),
});

export const EmergencyCancelSchema = z.object({
  officeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(3, 'Please provide a reason for cancellation').max(200),
});

export const OfficeHolidaySchema = z.object({
  officeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2, 'Holiday name is required').max(100),
});

// ── Payment Schemas ────────────────────────────────────────────────────
export const PaymentMarkPaidSchema = z.object({
  paymentId: z.string(),
  notes: z.string().max(300).optional(),
});

// ── Notification Schemas ───────────────────────────────────────────────
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  userAgent: z.string().optional(),
});

export const NotificationPreferencesSchema = z.object({
  lunchReminder: z.boolean().default(true),
  cutoffWarning: z.boolean().default(true),
  autoDefaultAlert: z.boolean().default(true),
  paymentReminders: z.boolean().default(true),
  weeklySummary: z.boolean().default(true),
});

export const RemindPendingSchema = z.object({
  officeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
