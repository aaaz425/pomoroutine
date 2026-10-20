import {
  addHours,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  min as minDate,
  parseISO,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { FocusPeriod } from '../types/timer';
import { TIMER_LIMITS } from '../constants/limits';
import { clampPeriodDuration } from './focusPeriods';
import { toDateKey } from './sessionFormat';

export type TabType = 'today' | 'week' | 'month' | 'all';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
}

type SessionLike = {
  startedAt: string;
  focusSeconds: number;
  focusPeriods: FocusPeriod[];
};

export function getMonthlyActivityData<T extends { startedAt: string; focusSeconds: number }>(
  sessions: T[],
  today: Date = new Date(),
): DayActivity[] {
  const days = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });

  // 날짜별로 한 번만 순회해 집계 — 매 날짜마다 전체 세션을 다시 필터링하면 O(days*n)이 됨
  const secondsByDate = new Map<string, number>();
  for (const s of sessions) {
    const dateKey = toDateKey(parseISO(s.startedAt));
    secondsByDate.set(dateKey, (secondsByDate.get(dateKey) ?? 0) + s.focusSeconds);
  }

  return days.map((day) => {
    const dateKey = toDateKey(day);
    const focusSeconds = secondsByDate.get(dateKey) ?? 0;
    // 1분 미만 집중도 캘린더에서 사라지지 않도록 반올림 대신 최소 1분 보장
    const focusMinutes = focusSeconds > 0 ? Math.max(1, Math.round(focusSeconds / 60)) : 0;
    return { date: dateKey, focusMinutes };
  });
}

function getTabInterval(tab: Exclude<TabType, 'all'>, today: Date) {
  switch (tab) {
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    case 'week':
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
  }
}

export function filterSessionsByTab<T extends SessionLike>(
  sessions: T[],
  tab: TabType,
  today: Date = new Date(),
): T[] {
  if (tab === 'all') return sessions;
  const interval = getTabInterval(tab, today);
  return sessions.filter((s) => isWithinInterval(parseISO(s.startedAt), interval));
}

export function getTotalFocusSeconds<T extends SessionLike>(sessions: T[]): number {
  return sessions.reduce((sum, s) => sum + s.focusSeconds, 0);
}

function addPeriodToHourlyTotals(totals: number[], period: FocusPeriod): void {
  const clamped = clampPeriodDuration(period, TIMER_LIMITS.FOCUS_MINUTES_MAX * 60);
  const periodEnd = parseISO(clamped.end);
  let cursor = parseISO(clamped.start);
  while (cursor < periodEnd) {
    const nextHour = addHours(startOfHour(cursor), 1);
    const segmentEnd = minDate([nextHour, periodEnd]);
    totals[cursor.getHours()] += (segmentEnd.getTime() - cursor.getTime()) / 1000;
    cursor = segmentEnd;
  }
}

export function getHourlyFocusSeconds<T extends SessionLike>(sessions: T[]): number[] {
  const totals = Array<number>(24).fill(0);
  for (const s of sessions) {
    if (s.focusPeriods.length === 0) {
      totals[parseISO(s.startedAt).getHours()] += s.focusSeconds;
      continue;
    }
    for (const period of s.focusPeriods) addPeriodToHourlyTotals(totals, period);
  }
  return totals;
}

export function getAvgSessionSeconds<T extends SessionLike>(sessions: T[]): number {
  if (sessions.length === 0) return 0;
  return Math.round(getTotalFocusSeconds(sessions) / sessions.length);
}
