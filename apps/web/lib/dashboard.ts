import { addMonths, addWeeks, max, min, parseISO, startOfMonth, startOfWeek } from 'date-fns';

import type {
  Category,
  CategoryFocusItem,
  DashboardSession,
  DashboardSummary,
  FocusTrendItem,
  FocusTrendMeta,
  TabStats,
  TabType,
  Task,
  YearlyCategoryMinutes,
} from '@/types';
import {
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
} from '@pomoroutine/shared';

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
};

interface CategoryMinutesRow {
  label: string;
  categoryId: string | null;
  minutes: number;
}

const UNCATEGORIZED = { name: '미분류', color: '#6b7280' };

function resolveCategory(
  categoryId: string | null,
  categoryMap: Map<string, Category>,
): { name: string; color: string } {
  const cat = categoryId ? categoryMap.get(categoryId) : undefined;
  return cat ? { name: cat.name, color: cat.color } : UNCATEGORIZED;
}

function toCategoryRows(
  sessions: DashboardSession[],
  tasks: Task[],
  getLabel: (session: DashboardSession) => string,
): CategoryMinutesRow[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  return sessions.map((s) => ({
    label: getLabel(s),
    categoryId: (s.taskId && taskMap.get(s.taskId)?.categoryId) || null,
    minutes: Math.round(s.focusSeconds / 60),
  }));
}

function fromYearlyRows(rows: YearlyCategoryMinutes[]): CategoryMinutesRow[] {
  return rows.map((r) => ({ label: r.year, categoryId: r.categoryId, minutes: r.minutes }));
}

function buildFocusTrend(
  labels: string[],
  rows: CategoryMinutesRow[],
  categories: Category[],
): FocusTrendMeta {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const dataMap = new Map<string, FocusTrendItem>(labels.map((l) => [l, { label: l }]));
  const catColorMap = new Map<string, string>();

  for (const row of rows) {
    const item = dataMap.get(row.label);
    if (!item) continue;
    const { name, color } = resolveCategory(row.categoryId, categoryMap);
    item[name] = ((item[name] as number | undefined) ?? 0) + row.minutes;
    catColorMap.set(name, color);
  }

  const catTotals = new Map<string, number>();
  for (const item of dataMap.values()) {
    for (const [k, v] of Object.entries(item)) {
      if (k === 'label') continue;
      catTotals.set(k, (catTotals.get(k) ?? 0) + (v as number));
    }
  }
  const usedCategories = Array.from(catTotals.entries())
    .filter(([, total]) => total > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => ({ name, color: catColorMap.get(name) ?? UNCATEGORIZED.color }));

  return {
    data: labels.map((l) => dataMap.get(l)!),
    categories: usedCategories,
  };
}

function buildCategoryFocus(
  rows: CategoryMinutesRow[],
  categories: Category[],
): CategoryFocusItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const minuteMap = new Map<string, { minutes: number; color: string }>();

  for (const row of rows) {
    const { name, color } = resolveCategory(row.categoryId, categoryMap);
    const existing = minuteMap.get(name);
    minuteMap.set(name, { minutes: (existing?.minutes ?? 0) + row.minutes, color });
  }

  const total = Array.from(minuteMap.values()).reduce((sum, { minutes }) => sum + minutes, 0);
  if (total === 0) return [];

  return Array.from(minuteMap.entries())
    .filter(([, { minutes }]) => minutes > 0)
    .sort(([, a], [, b]) => b.minutes - a.minutes)
    .map(([name, { minutes, color }]) => ({
      name,
      minutes,
      percent: Math.round((minutes / total) * 100),
      color,
    }));
}

export function getFocusTrendData(
  sessions: DashboardSession[],
  tasks: Task[],
  categories: Category[],
  tab: Exclude<TabType, 'all'>,
  today: Date = new Date(),
): FocusTrendMeta {
  let labels: string[];
  let getLabel: (session: DashboardSession) => string;

  if (tab === 'today') {
    labels = ['오늘'];
    getLabel = () => '오늘';
  } else if (tab === 'week') {
    labels = ['월', '화', '수', '목', '금', '토', '일'];
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    getLabel = (s) => {
      const d = parseISO(s.startedAt);
      const diff = Math.floor((d.getTime() - weekStart.getTime()) / 86400000);
      return labels[Math.max(0, Math.min(diff, 6))];
    };
  } else {
    labels = ['1주차', '2주차', '3주차', '4주차'];
    const monthStart = startOfMonth(today);
    getLabel = (s) => {
      const d = parseISO(s.startedAt);
      const diffDays = Math.floor((d.getTime() - monthStart.getTime()) / 86400000);
      const weekIdx = Math.min(Math.floor(diffDays / 7), 3);
      return labels[weekIdx];
    };
  }

  return buildFocusTrend(labels, toCategoryRows(sessions, tasks, getLabel), categories);
}

export function getAllTimeFocusTrend(
  yearly: YearlyCategoryMinutes[],
  categories: Category[],
): FocusTrendMeta {
  if (yearly.length === 0) return { data: [], categories: [] };
  const labels = Array.from(new Set(yearly.map((r) => r.year))).sort();
  return buildFocusTrend(labels, fromYearlyRows(yearly), categories);
}

export function getCategoryFocusData(
  sessions: DashboardSession[],
  tasks: Task[],
  categories: Category[],
): CategoryFocusItem[] {
  return buildCategoryFocus(
    toCategoryRows(sessions, tasks, () => ''),
    categories,
  );
}

export function getAllTimeCategoryFocus(
  yearly: YearlyCategoryMinutes[],
  categories: Category[],
): CategoryFocusItem[] {
  return buildCategoryFocus(fromYearlyRows(yearly), categories);
}

export function getDashboardRange(today: Date = new Date()): { startIso: string; endIso: string } {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  return {
    startIso: min([weekStart, monthStart]).toISOString(),
    endIso: max([addWeeks(weekStart, 1), addMonths(monthStart, 1)]).toISOString(),
  };
}

export function getTabStats(
  tab: TabType,
  periodSessions: DashboardSession[],
  summary: DashboardSummary,
  tasks: Task[],
  categories: Category[],
  today: Date = new Date(),
): TabStats {
  if (tab === 'all') {
    const { focusSeconds, count, yearlyCategoryMinutes, hourlySeconds } = summary.allTime;
    return {
      focusSeconds,
      count,
      avgSeconds: count === 0 ? 0 : Math.round(focusSeconds / count),
      focusTrend: getAllTimeFocusTrend(yearlyCategoryMinutes, categories),
      categoryFocus: getAllTimeCategoryFocus(yearlyCategoryMinutes, categories),
      hourlySeconds,
    };
  }
  const filtered = filterSessionsByTab(periodSessions, tab, today);
  return {
    focusSeconds: getTotalFocusSeconds(filtered),
    count: getSessionCount(filtered),
    avgSeconds: getAvgSessionSeconds(filtered),
    focusTrend: getFocusTrendData(filtered, tasks, categories, tab, today),
    categoryFocus: getCategoryFocusData(filtered, tasks, categories),
    hourlySeconds: getHourlyFocusSeconds(filtered),
  };
}
