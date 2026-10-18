import { z } from 'zod';
import type { Category } from '@/types/models';
import { TIMER_LIMITS, INPUT_LIMITS, SOUND_LIMITS, AUTH_LIMITS } from '@/lib/constants/limits';

export const CategorySchema = z.object({
  id: z.string(),
  // 카테고리 이름도 짧은 라벨이라 닉네임과 동일 기준(NICKNAME_MAX_LENGTH) 재사용
  name: z.string().max(INPUT_LIMITS.NICKNAME_MAX_LENGTH),
  color: z.string().refine((v) => /^#[0-9a-f]{6}$/i.test(v), { message: 'hex color required' }),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().max(INPUT_LIMITS.TITLE_MAX_LENGTH),
  categoryId: z.string(),
  createdAt: z.string(),
});

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

export const TimerSettingsSchema = z.object({
  focusMinutes: z.number().min(TIMER_LIMITS.FOCUS_MINUTES_MIN).max(TIMER_LIMITS.FOCUS_MINUTES_MAX),
  shortBreakMinutes: z
    .number()
    .min(TIMER_LIMITS.BREAK_MINUTES_MIN)
    .max(TIMER_LIMITS.BREAK_MINUTES_MAX),
  totalCycles: z.number().min(TIMER_LIMITS.CYCLES_MIN).max(TIMER_LIMITS.CYCLES_MAX),
});

// 새로고침 복구용 — 진행 중이거나 아직 기록 안 한(sessionEnded) 활성 타이머 1개의 스냅샷
export const RawFocusPeriodSchema = z.object({
  start: z.number(),
  end: z.number(),
});

export const ActiveTimerStateSchema = z.object({
  phase: z.enum(['focus', 'short-break']),
  // 기존 localStorage 데이터에는 없는 필드이므로 .default() 필수
  mode: z.enum(['pomodoro', 'free']).default('pomodoro'),
  remainingSeconds: z.number(),
  startedAt: z.number().nullable(),
  cycleCount: z.number(),
  currentTaskId: z.string().nullable(),
  settings: TimerSettingsSchema,
  sessionEnded: z.boolean(),
  sessionStarted: z.boolean(),
  sessionStartedAt: z.number().nullable(),
  sessionEndedAt: z.number().nullable(),
  accFocusSeconds: z.number(),
  rawFocusPeriods: z.array(RawFocusPeriodSchema),
  // 기존 localStorage 데이터에는 없는 필드이므로 .default() 필수 — 없으면 parse 실패 시 진행 중이던 세션이 전부 초기화됨
  lastActiveAt: z.number().nullable().default(null),
});

export const AppSettingsSchema = z.object({
  nickname: z.string().max(INPUT_LIMITS.NICKNAME_MAX_LENGTH),
  browserNotification: z.boolean(),
  soundAlert: z.boolean(),
  // 기존 localStorage 데이터에는 없는 필드이므로 .default() 필수 — 없으면 parse 실패 시 전체 설정이 초기화됨
  soundType: z.enum(['sine', 'chime', 'bell', 'digital']).default('sine'),
  soundVolume: z.number().min(SOUND_LIMITS.VOLUME_MIN).max(SOUND_LIMITS.VOLUME_MAX).default(70),
  soundRepeatCount: z.number().min(SOUND_LIMITS.REPEAT_MIN).max(SOUND_LIMITS.REPEAT_MAX).default(2),
  motivationalMessages: z
    .array(z.string().min(INPUT_LIMITS.MESSAGE_LENGTH_MIN).max(INPUT_LIMITS.MESSAGE_LENGTH_MAX))
    .min(INPUT_LIMITS.MESSAGE_COUNT_MIN)
    .max(INPUT_LIMITS.MESSAGE_COUNT_MAX),
  defaultTimerSettings: TimerSettingsSchema,
  keepScreenAwake: z.boolean().default(false),
});

export const LoginCredentialsSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 형식이 아니에요' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요' }),
});

export const SignupCredentialsSchema = z
  .object({
    email: z.string().email({ message: '올바른 이메일 형식이 아니에요' }),
    password: z
      .string()
      .min(AUTH_LIMITS.PASSWORD_MIN_LENGTH, { message: '비밀번호는 8자 이상이어야 해요' }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않아요',
    path: ['passwordConfirm'],
  });

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 형식이 아니에요' }),
});

export const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(AUTH_LIMITS.PASSWORD_MIN_LENGTH, { message: '비밀번호는 8자 이상이어야 해요' }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않아요',
    path: ['passwordConfirm'],
  });

export const STORAGE_KEYS = {
  activeTimer: 'pomoroutine:active-timer',
  theme: 'theme',
  colorTheme: 'pomoroutine:color-theme',
} as const;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: '공부', color: '#3b82f6' },
  { id: '2', name: '업무', color: '#22c55e' },
  { id: '3', name: '운동', color: '#f97316' },
  { id: '4', name: '독서', color: '#a855f7' },
  { id: '5', name: '기타', color: '#6b7280' },
];

export { DEFAULT_TIMER_SETTINGS } from '@pomoroutine/shared';
