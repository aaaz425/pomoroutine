import { format, isSameDay, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { TimerMode, FocusPeriod } from '../types/timer';
import { TIMER_LIMITS } from '../constants/limits';
import { clampPeriodDuration } from './focusPeriods';

export interface SessionGroup<T> {
  dateKey: string;
  displayLabel: string;
  totalFocusSeconds: number;
  sessions: T[];
}

export function formatCount(count: number): string {
  return count.toLocaleString('ko-KR');
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours === 0 ? `${days}일` : `${days}일 ${remHours}시간`;
  }
  if (hours === 0) return `${mins}분`;
  if (remMins === 0) return `${hours}시간`;
  return `${hours}시간 ${remMins}분`;
}

export function formatSessionProgressLabel(
  mode: TimerMode,
  {
    cycleCount,
    totalCycles,
    focusSeconds,
  }: { cycleCount: number; totalCycles: number; focusSeconds: number },
): string {
  return mode === 'free'
    ? `자유 집중 ${formatDuration(focusSeconds)}`
    : `완료된 사이클 ${cycleCount} / ${totalCycles}`;
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toLocalDateKey(isoString: string): string {
  return toDateKey(new Date(isoString));
}

function formatDisplayLabel(dateKey: string, todayKey: string, yesterdayKey: string): string {
  if (dateKey === todayKey) return '오늘';
  if (dateKey === yesterdayKey) return '어제';
  const d = new Date(dateKey);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export function groupSessionsByDate<T extends { startedAt: string; focusSeconds: number }>(
  sessions: T[],
  ref?: Date,
): SessionGroup<T>[] {
  if (sessions.length === 0) return [];

  const now = ref ?? new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = toDateKey(now);
  const yesterdayKey = toDateKey(yesterday);

  const map = new Map<string, T[]>();
  for (const session of sessions) {
    const key = toLocalDateKey(session.startedAt);
    const group = map.get(key);
    if (group) {
      group.push(session);
    } else {
      map.set(key, [session]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupSessions]) => ({
      dateKey,
      displayLabel: formatDisplayLabel(dateKey, todayKey, yesterdayKey),
      totalFocusSeconds: groupSessions.reduce((sum, s) => sum + s.focusSeconds, 0),
      sessions: [...groupSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    }));
}

export function getSessionsForDate<T extends { startedAt: string }>(
  sessions: T[],
  date: Date,
): T[] {
  const key = toDateKey(date);
  return sessions.filter((s) => toLocalDateKey(s.startedAt) === key);
}

export function getSessionOrdinalTitle(startedAt: string, chronologicalIndex: number): string {
  const d = new Date(startedAt);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}월 ${day}일 ${chronologicalIndex + 1}번째 기록`;
}

export function formatTimeRange(startedAt: string, endedAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  return `${fmt(startedAt)} — ${fmt(endedAt)}`;
}

export function formatStartedAtLabel(startedAt: number, now = Date.now()): string {
  const time = format(startedAt, 'a h:mm', { locale: ko });
  if (isSameDay(startedAt, now)) return time;
  if (isSameDay(startedAt, subDays(now, 1))) return `어제 ${time}`;
  return `${format(startedAt, 'M월 d일', { locale: ko })} ${time}`;
}

export function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatFocusPeriodRanges(periods: FocusPeriod[], maxShown = 4): string {
  if (periods.length === 0) return '';
  const ranges = periods
    .slice(0, maxShown)
    .map((p) => clampPeriodDuration(p, TIMER_LIMITS.FOCUS_MINUTES_MAX * 60))
    .map((p) => formatTimeRange(p.start, p.end))
    .join(', ');
  const rest = periods.length - maxShown;
  return rest > 0 ? `${ranges} 외 ${rest}개` : ranges;
}

// 정상 설정으로는 나올 수 없는 간격(휴식 시간 상한 초과)이 구간 사이에 있는지 — 다사이클 세션의 정상 휴식과 구분하기 위함
export function hasAbnormalFocusGap(periods: FocusPeriod[]): boolean {
  const maxBreakMs = TIMER_LIMITS.BREAK_MINUTES_MAX * 60 * 1000;
  for (let i = 1; i < periods.length; i++) {
    const gapMs = new Date(periods[i].start).getTime() - new Date(periods[i - 1].end).getTime();
    if (gapMs > maxBreakMs) return true;
  }
  return false;
}

export function formatSessionTimeSummary(
  startedAt: string,
  endedAt: string,
  focusPeriods: FocusPeriod[],
): string {
  const range = formatTimeRange(startedAt, endedAt);
  return hasAbnormalFocusGap(focusPeriods) ? `${range} · ${focusPeriods.length}구간` : range;
}

export function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
