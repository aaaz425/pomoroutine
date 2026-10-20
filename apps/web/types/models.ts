import type {
  TimerPhase,
  TimerMode,
  TimerSettings,
  FocusRating,
  Task,
  Category,
  Session,
  SessionGroup as SharedSessionGroup,
  DayActivity,
} from '@pomoroutine/shared';

export type { TimerPhase, TimerMode, TimerSettings, FocusRating, Task, Category, Session };

export type DashboardSession = Pick<
  Session,
  'id' | 'taskId' | 'startedAt' | 'focusSeconds' | 'focusPeriods'
>;

export type { SoundType } from '@pomoroutine/shared';

export type { TabType } from '@pomoroutine/shared';
export type { DayActivity };

export type JournalTab = 'list' | 'calendar';

export interface PeriodStat {
  focusSeconds: number;
  count: number;
}

// get_dashboard_summary RPC 응답 — 전체 히스토리를 스캔해야 하는 통계만 담는다 (docs/guides/data-models.md 참고)
export interface DashboardSummary {
  streakDays: number;
  maxStreakDays: number;
  monthlyActivity: DayActivity[];
  monthFocusSeconds: number;
  busiestDay: string | null;
  firstSessionDate: string | null; // ISO 8601
  prevDay: PeriodStat;
  prevWeek: PeriodStat;
  prevMonth: PeriodStat;
  allTime: AllTimeStats;
  badgeStats: BadgeStats;
}

export interface YearlyCategoryMinutes {
  year: string; // yyyy
  categoryId: string | null;
  minutes: number;
}

export interface AllTimeStats {
  focusSeconds: number;
  count: number;
  yearlyCategoryMinutes: YearlyCategoryMinutes[];
  hourlySeconds: number[];
}

export interface BadgeStats {
  categoryCount: number;
  nightOwl: boolean;
  weekendWarrior: boolean;
  perfectSession: boolean;
  marathon: boolean;
}

export interface FocusTrendItem {
  label: string;
  [key: string]: number | string;
}

export interface FocusTrendMeta {
  data: FocusTrendItem[];
  categories: Array<{ name: string; color: string }>;
}

export interface TabStats {
  focusSeconds: number;
  count: number;
  avgSeconds: number;
  focusTrend: FocusTrendMeta;
  categoryFocus: CategoryFocusItem[];
  hourlySeconds: number[];
}

export interface CategoryFocusItem {
  name: string;
  minutes: number;
  percent: number;
  color: string;
}

export type SessionGroup = SharedSessionGroup<Session>;

export interface DistractionFrequency {
  tagId: string;
  count: number;
}

export interface FocusRatingTrend {
  recentAvg: number | null; // 평점 입력된 세션이 하나도 없으면 null
  previousAvg: number | null;
  sampleSize: number; // recentAvg 계산에 쓰인 세션 수 — 신뢰도 판단용
}

export type InsightSession = Pick<
  Session,
  'id' | 'taskId' | 'startedAt' | 'focusRating' | 'distractionTags'
>;

export interface CategoryRatingTotal {
  categoryId: string;
  sum: number;
  count: number;
}

export interface JournalSummary {
  count: number;
  categoryRatings: CategoryRatingTotal[];
}

export type SessionEditableFields = Pick<
  Session,
  'title' | 'note' | 'focusRating' | 'distractionTags' | 'taskId'
>;

export interface SessionListFilters {
  categoryIds: string[];
  search: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
}

export interface CategoryRatingItem {
  categoryId: string;
  categoryName: string;
  avgRating: number;
  sampleSize: number;
}

export type { ShareCardData } from '@pomoroutine/shared';

export interface AuthActionResult {
  error?: string;
  pendingConfirmation?: true;
  success?: true;
}

export interface SettingsUser {
  email: string | null;
  provider: string | null;
}
