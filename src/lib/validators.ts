import { z } from "zod";

export const habitBaseSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1024).optional(),
  icon: z.string().max(64).optional(),
  color: z.string().max(32).optional(),
  category: z.string().max(64).optional(),
  trackType: z.enum(["binary", "count", "duration", "timer"]),
  scheduleType: z.enum(["daily", "weekly", "monthly", "custom"]),
  countTarget: z.number().int().positive().optional(),
  perPeriod: z.enum(["day", "week", "month"]).optional(),
  allowedDays: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  dayBoundaryOffsetMinutes: z.number().min(-720).max(720).optional(),
  skipPolicy: z.enum(["none", "allow_skips", "vacation"]).optional(),
  freezeEnabled: z.boolean().optional(),
});

export const habitCreateSchema = habitBaseSchema;

export const habitUpdateSchema = habitBaseSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const checkinCreateSchema = z.object({
  occurredAt: z.string().datetime({ offset: true }).optional(),
  quantity: z.number().optional(),
  note: z.string().max(512).optional(),
  source: z.enum(["manual", "timer"]).optional(),
});

export const skipCreateSchema = z.object({
  localDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(512).optional(),
});

export const freezeActivateSchema = z.object({
  habitId: z.string().uuid().optional(),
  coveredLocalDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const profileUpdateSchema = z.object({
  timezone: z.string().min(1).optional(),
  weekStart: z.enum(["mon", "sun"]).optional(),
  preferences: z.record(z.any()).optional(),
});

export const analyticsQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;

