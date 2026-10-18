'use client';

import { ChartColumn, CircleCheck, Flame, Share2, Timer } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';

import { BadgeGallery } from '@/components/dashboard/BadgeGallery';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { ErrorFallback } from '@/components/shared/ErrorFallback';
import { FocusChart } from '@/components/dashboard/FocusChart';
import { HourlyChart } from '@/components/dashboard/HourlyChart';
import { MonthlyActivityCard } from '@/components/dashboard/MonthlyActivityCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { getEarnedBadgeIds, toBadgeProgress } from '@/lib/badges';
import { getTabStats } from '@/lib/dashboard';
import { buildShareCardData } from '@/lib/shareCard';
import type { TabType } from '@/types';
import { formatCount, formatDuration } from '@/lib/sessionUtils';
import { useTaskStore } from '@/store/StoreProvider';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';
import { useDelayedHydration } from '@/hooks/useDelayedHydration';

// 캔버스 렌더링 로직이 무거운데 공유 버튼을 눌러야만 열리므로 초기 대시보드 번들에서 제외
const ShareCardModal = dynamic(() =>
  import('@/components/dashboard/ShareCardModal').then((mod) => mod.ShareCardModal),
);

function makeFocusSub(diff: number, label: string): string | undefined {
  if (diff === 0) return undefined;
  const sign = diff > 0 ? '+' : '-';
  return `${label} ${sign}${formatDuration(Math.abs(diff))}`;
}

function makeCountSub(diff: number, label: string): string | undefined {
  if (diff === 0) return undefined;
  const sign = diff > 0 ? '+' : '-';
  return `${label} ${sign}${formatCount(Math.abs(diff))}건`;
}

export function DashboardView() {
  const { hydrated } = useDelayedHydration();
  const [tab, setTab] = useState<TabType>('week');
  const [shareOpen, setShareOpen] = useState(false);

  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const { summary, periodSessions, isError, refetch } = useDashboardData();

  const showSkeleton = useDelayedFlag(!hydrated || !summary || !periodSessions);

  if (hydrated && isError && (!summary || !periodSessions)) {
    return <ErrorFallback onRetry={refetch} />;
  }

  if (!hydrated || !summary || !periodSessions) {
    return showSkeleton ? <DashboardSkeleton /> : null;
  }

  const stats = getTabStats(tab, periodSessions, summary, tasks, categories);
  const totalFocusSeconds = stats.focusSeconds;
  const sessionCount = stats.count;
  const avgSessionSeconds = stats.avgSeconds;
  const shareCardData = buildShareCardData(
    { focusSeconds: totalFocusSeconds, count: sessionCount },
    summary.streakDays,
    tab,
  );
  const earnedIds = getEarnedBadgeIds(toBadgeProgress(summary));

  const {
    streakDays,
    maxStreakDays,
    monthlyActivity,
    monthFocusSeconds,
    busiestDay,
    prevDay,
    prevWeek,
    prevMonth,
  } = summary;
  const firstSessionDate = summary.firstSessionDate ? new Date(summary.firstSessionDate) : null;

  const focusLabel =
    tab === 'today'
      ? '오늘 집중 시간'
      : tab === 'week'
        ? '이번 주 집중 시간'
        : tab === 'month'
          ? '이번 달 집중 시간'
          : '전체 집중 시간';

  const sessionLabel =
    tab === 'today'
      ? '오늘 기록'
      : tab === 'week'
        ? '이번 주 기록'
        : tab === 'month'
          ? '이번 달 기록'
          : '전체 기록';

  const focusSub: string | undefined = (() => {
    if (tab === 'today' && prevDay.focusSeconds > 0)
      return makeFocusSub(totalFocusSeconds - prevDay.focusSeconds, '어제 대비');
    if (tab === 'week' && prevWeek.focusSeconds > 0)
      return makeFocusSub(totalFocusSeconds - prevWeek.focusSeconds, '전주 대비');
    if (tab === 'month' && prevMonth.focusSeconds > 0)
      return makeFocusSub(totalFocusSeconds - prevMonth.focusSeconds, '전월 대비');
    if (tab === 'all' && firstSessionDate)
      return `${firstSessionDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}부터`;
    return undefined;
  })();

  const sessionCountSub: string | undefined = (() => {
    if (tab === 'today' && prevDay.count > 0)
      return makeCountSub(sessionCount - prevDay.count, '어제 대비');
    if (tab === 'week' && prevWeek.count > 0)
      return makeCountSub(sessionCount - prevWeek.count, '전주 대비');
    if (tab === 'month' && prevMonth.count > 0)
      return makeCountSub(sessionCount - prevMonth.count, '전월 대비');
    return undefined;
  })();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">통계</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShareOpen(true)}
            aria-label="공유 카드 만들기"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <DashboardTabs value={tab} onChange={setTab} />
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={focusLabel}
          Icon={Timer}
          value={totalFocusSeconds === 0 ? '0분' : formatDuration(totalFocusSeconds)}
          sub={focusSub}
        />
        <StatCard
          label={sessionLabel}
          Icon={CircleCheck}
          value={`${formatCount(sessionCount)}건`}
          sub={sessionCountSub}
        />
        <StatCard
          label="연속 집중일"
          Icon={Flame}
          value={`${streakDays}일`}
          sub={maxStreakDays > streakDays ? `최장 ${maxStreakDays}일` : '현재 연속 기록'}
        />
        <StatCard
          label="기록 평균"
          Icon={ChartColumn}
          value={avgSessionSeconds === 0 ? '-' : formatDuration(avgSessionSeconds)}
          sub="기록당 평균 시간"
        />
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FocusChart trend={stats.focusTrend} focusLabel={focusLabel} />

        <MonthlyActivityCard
          monthlyActivity={monthlyActivity}
          monthFocusSeconds={monthFocusSeconds}
          maxStreakDays={maxStreakDays}
          busiestDay={busiestDay}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryChart data={stats.categoryFocus} />
        <HourlyChart hourly={stats.hourlySeconds} />
      </div>

      {/* Badge Gallery */}
      <BadgeGallery earnedIds={earnedIds} />

      {shareOpen && <ShareCardModal data={shareCardData} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
