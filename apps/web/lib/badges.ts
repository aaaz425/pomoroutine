import type { BadgeProgress } from '@pomoroutine/shared';
import type { DashboardSummary } from '@/types';

export function toBadgeProgress(summary: DashboardSummary): BadgeProgress {
  const { badgeStats } = summary;
  return {
    maxStreakDays: summary.maxStreakDays,
    totalFocusSeconds: summary.allTime.focusSeconds,
    categoryCount: badgeStats.categoryCount,
    specialEvents: {
      'first-session': summary.allTime.count > 0,
      'night-owl': badgeStats.nightOwl,
      'weekend-warrior': badgeStats.weekendWarrior,
      'perfect-session': badgeStats.perfectSession,
      marathon: badgeStats.marathon,
    },
  };
}
