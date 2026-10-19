import { z } from 'zod';
import { INPUT_LIMITS } from '@/lib/constants/limits';

export const FocusPeriodSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const SessionSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  title: z.string().max(INPUT_LIMITS.TITLE_MAX_LENGTH).nullable(),
  // 기존 localStorage 데이터에는 없는 필드이므로 .default() 필수
  mode: z.enum(['pomodoro', 'free']).default('pomodoro'),
  startedAt: z.string(),
  endedAt: z.string(),
  completedCycles: z.number(),
  totalCycles: z.number(),
  focusSeconds: z.number(),
  pausedSeconds: z.number(),
  focusPeriods: z.array(FocusPeriodSchema),
  note: z.string().max(INPUT_LIMITS.NOTE_MAX_LENGTH).nullable(),
  // 기존 localStorage 데이터에는 없는 필드이므로 .default() 필수
  focusRating: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .nullable()
    .default(null),
  distractionTags: z.array(z.string().max(INPUT_LIMITS.DISTRACTION_TAG_MAX_LENGTH)).default([]),
});

export const DashboardSessionSchema = SessionSchema.pick({
  id: true,
  taskId: true,
  startedAt: true,
  focusSeconds: true,
  focusPeriods: true,
});

export const InsightSessionSchema = SessionSchema.pick({
  id: true,
  taskId: true,
  startedAt: true,
  focusRating: true,
  distractionTags: true,
});

export const JournalSummarySchema = z.object({
  count: z.number(),
  categoryRatings: z.array(
    z.object({ categoryId: z.string(), sum: z.number(), count: z.number() }),
  ),
});

const PeriodStatSchema = z.object({
  focusSeconds: z.number(),
  count: z.number(),
});

const DayActivitySchema = z.object({
  date: z.string(),
  focusMinutes: z.number(),
});

const AllTimeStatsSchema = z.object({
  focusSeconds: z.number(),
  count: z.number(),
  yearlyCategoryMinutes: z.array(
    z.object({ year: z.string(), categoryId: z.string().nullable(), minutes: z.number() }),
  ),
  hourlySeconds: z.array(z.number()).length(24),
});

const BadgeStatsSchema = z.object({
  categoryCount: z.number(),
  nightOwl: z.boolean(),
  weekendWarrior: z.boolean(),
  perfectSession: z.boolean(),
  marathon: z.boolean(),
});

export const DashboardSummarySchema = z.object({
  streakDays: z.number(),
  maxStreakDays: z.number(),
  monthlyActivity: z.array(DayActivitySchema),
  monthFocusSeconds: z.number(),
  busiestDay: z.string().nullable(),
  firstSessionDate: z.string().nullable(),
  prevDay: PeriodStatSchema,
  prevWeek: PeriodStatSchema,
  prevMonth: PeriodStatSchema,
  allTime: AllTimeStatsSchema,
  badgeStats: BadgeStatsSchema,
});

export const STORAGE_KEYS = {
  activeTimer: 'pomoroutine:active-timer',
  theme: 'theme',
  colorTheme: 'pomoroutine:color-theme',
} as const;

export {
  TaskSchema,
  ActiveTimerStateSchema,
  LoginCredentialsSchema,
  SignupCredentialsSchema,
  ForgotPasswordSchema,
  NewPasswordSchema,
  DEFAULT_CATEGORIES,
} from '@pomoroutine/shared';
