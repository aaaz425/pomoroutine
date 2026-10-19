import { z } from 'zod';
import { AUTH_LIMITS, INPUT_LIMITS, SOUND_LIMITS, TIMER_LIMITS } from './constants/limits';

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().max(INPUT_LIMITS.NICKNAME_MAX_LENGTH),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().max(INPUT_LIMITS.TITLE_MAX_LENGTH),
  categoryId: z.string(),
  createdAt: z.string(),
});

export const TimerSettingsSchema = z.object({
  focusMinutes: z.number().min(TIMER_LIMITS.FOCUS_MINUTES_MIN).max(TIMER_LIMITS.FOCUS_MINUTES_MAX),
  shortBreakMinutes: z
    .number()
    .min(TIMER_LIMITS.BREAK_MINUTES_MIN)
    .max(TIMER_LIMITS.BREAK_MINUTES_MAX),
  totalCycles: z.number().min(TIMER_LIMITS.CYCLES_MIN).max(TIMER_LIMITS.CYCLES_MAX),
});

export const RawFocusPeriodSchema = z.object({
  start: z.number(),
  end: z.number(),
});

export const ActiveTimerStateSchema = z.object({
  phase: z.enum(['focus', 'short-break']),
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
  lastActiveAt: z.number().nullable().default(null),
});

export const AppSettingsSchema = z.object({
  nickname: z.string().max(INPUT_LIMITS.NICKNAME_MAX_LENGTH),
  browserNotification: z.boolean(),
  soundAlert: z.boolean(),
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

const emailField = z.string().email({ message: '올바른 이메일 형식이 아니에요' });
const newPasswordField = z
  .string()
  .min(AUTH_LIMITS.PASSWORD_MIN_LENGTH, { message: '비밀번호는 8자 이상이어야 해요' });
const passwordsMatch = {
  message: '비밀번호가 일치하지 않아요',
  path: ['passwordConfirm'],
};

export const LoginCredentialsSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: '비밀번호를 입력해주세요' }),
});

export const SignupCredentialsSchema = z
  .object({ email: emailField, password: newPasswordField, passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, passwordsMatch);

export const ForgotPasswordSchema = z.object({ email: emailField });

export const NewPasswordSchema = z
  .object({ password: newPasswordField, passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, passwordsMatch);
