import { formatDuration } from '@pomoroutine/shared';
import { ContributionCalendar } from '@/components/dashboard/ContributionCalendar';
import type { DayActivity } from '@/types';

interface Props {
  monthlyActivity: DayActivity[];
  monthFocusSeconds: number;
  maxStreakDays: number;
  busiestDay: string | null;
}

export function MonthlyActivityCard({
  monthlyActivity,
  monthFocusSeconds,
  maxStreakDays,
  busiestDay,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-lg border border-border bg-card">
      <p className="text-sm font-semibold text-foreground">이달의 잔디</p>
      <div className="flex gap-5">
        <ContributionCalendar data={monthlyActivity} />
        <div className="flex flex-col justify-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">이번달 총 집중</span>
            <span className="text-sm font-bold text-foreground">
              {monthFocusSeconds === 0 ? '-' : formatDuration(monthFocusSeconds)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">최장 연속기록</span>
            <span className="text-sm font-bold text-foreground">{maxStreakDays}일</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">가장 활발한날</span>
            <span className="text-sm font-bold text-foreground">{busiestDay ?? '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
