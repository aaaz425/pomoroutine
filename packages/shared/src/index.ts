export type {
  TimerPhase,
  TimerMode,
  TimerSettings,
  FocusPeriod,
  RawFocusPeriod,
} from './types/timer';
export type { FocusRating } from './types/session';
export type {
  ShareCardAction,
  ShareCardBridgeMessage,
  WebviewBridgeMessage,
} from './types/webviewBridge';
export {
  TIMER_LIMITS,
  FOCUS_PERIOD_LIMITS,
  AUTH_LIMITS,
  INPUT_LIMITS,
  SOUND_LIMITS,
} from './constants/limits';
export { DEFAULT_TIMER_SETTINGS } from './constants/defaults';
export { MOTIVATIONAL_MESSAGES } from './constants/messages';
export { TOAST_MESSAGES } from './constants/toastMessages';
export type { ToastType, ToastMessage } from './constants/toastMessages';
export type { SoundType, AppSettings } from './types/settings';
export { FOCUS_RATING_OPTIONS, FOCUS_RATING_LABELS } from './constants/focusRating';
export { DISTRACTION_TAGS } from './constants/distractionTags';
export type { DistractionTag } from './constants/distractionTags';
export { LEGAL_DOCUMENTS } from './constants/legal';
export { WEBVIEW_TAB_BLUR_EVENT, WEBVIEW_TAB_FOCUS_EVENT } from './constants/webviewBridge';
export { createMutationTracker } from './lib/mutationTracker';
export type { MutationTracker } from './lib/mutationTracker';
export type { LegalDocType, LegalDocument, LegalBlock } from './constants/legal';
export { normalizeFocusPeriods, clampPeriodDuration } from './lib/focusPeriods';
export { hexToHsv, hsvToHex } from './lib/color';
export type { Hsv } from './lib/color';
export { isSessionStale } from './lib/sessionStale';
export { deriveTimerDisplay } from './lib/deriveTimerDisplay';
export type { DeriveTimerDisplayInput, TimerDisplayState } from './lib/deriveTimerDisplay';
export { deriveElapsedMinutes } from './lib/deriveElapsedMinutes';
export { getPhaseEndMessage } from './lib/phaseEndMessage';
export type { PhaseEndMessageInput } from './lib/phaseEndMessage';
export type { DeriveElapsedMinutesInput } from './lib/deriveElapsedMinutes';
export {
  formatDuration,
  formatSessionProgressLabel,
  toLocalDateKey,
  groupSessionsByDate,
  getSessionsForDate,
  getSessionOrdinalTitle,
  formatTimeRange,
  formatFullDate,
  formatFocusPeriodRanges,
  hasAbnormalFocusGap,
  formatSessionTimeSummary,
} from './lib/sessionFormat';
export type { SessionGroup } from './lib/sessionFormat';
export {
  getMonthlyActivityData,
  filterSessionsByTab,
  getTotalFocusSeconds,
  getHourlyFocusSeconds,
  getSessionCount,
  getAvgSessionSeconds,
  getStreakDays,
  getPrevDayStats,
  getPrevWeekStats,
  getPrevMonthStats,
  getMaxStreakDays,
  getBusiestDayOfWeek,
  getFirstSessionDate,
} from './lib/dashboard';
export type { DayActivity, TabType, PeriodStats } from './lib/dashboard';
export { BADGE_CATEGORY_LABELS, BADGE_DEFINITIONS, getEarnedBadgeIds } from './lib/badges';
export type {
  BadgeTier,
  BadgeIconKey,
  BadgeCategory,
  BadgeDefinition,
  SpecialEventId,
} from './lib/badges';
export { buildHeadline, buildShareCardData } from './lib/shareCard';
export type { ShareCardData } from './lib/shareCard';
export { COLOR_THEME_KEYS, COLOR_THEMES, DEFAULT_COLOR_THEME } from './constants/colorThemes';
export type {
  ColorThemeKey,
  AccentPair,
  ColorThemeAccent,
  ShareCardPalette,
  ColorThemeDefinition,
} from './constants/colorThemes';
export { createTimerStore } from './store/timerStore';
export type { TimerStore, TimerStoreApi, TimerSnapshot, TimerStorePorts } from './store/timerStore';
