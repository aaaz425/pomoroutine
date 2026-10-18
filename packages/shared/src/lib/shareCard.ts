import { format } from 'date-fns';
import type { TabType } from './dashboard';
import { formatDuration } from './sessionFormat';

export interface ShareCardData {
  periodLabel: string;
  headline: string;
  totalFocusLabel: string; // formatDuration() 결과, 0이면 '0분'
  sessionCount: number;
  streakDays: number;
  generatedAtLabel: string; // 'yyyy.MM.dd'
}

const PERIOD_LABELS: Record<TabType, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
  all: '전체',
};

export function buildHeadline(streakDays: number, totalFocusSeconds: number): string {
  if (totalFocusSeconds === 0) return '아직 집중 기록이 없어요';
  if (streakDays >= 7) return '일주일 넘게 이어가는 중이에요 🔥';
  if (streakDays >= 3) return '꾸준함이 쌓이고 있어요 ✨';
  if (streakDays >= 1) return '오늘도 집중했어요';
  return '집중을 시작했어요';
}

export interface ShareCardTotals {
  focusSeconds: number;
  count: number;
}

export function buildShareCardData(
  totals: ShareCardTotals,
  streakDays: number,
  tab: TabType,
  today: Date = new Date(),
): ShareCardData {
  const totalFocusSeconds = totals.focusSeconds;

  return {
    periodLabel: PERIOD_LABELS[tab],
    headline: buildHeadline(streakDays, totalFocusSeconds),
    totalFocusLabel: totalFocusSeconds === 0 ? '0분' : formatDuration(totalFocusSeconds),
    sessionCount: totals.count,
    streakDays,
    generatedAtLabel: format(today, 'yyyy.MM.dd'),
  };
}
