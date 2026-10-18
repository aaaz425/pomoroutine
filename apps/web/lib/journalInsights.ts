import { endOfDay, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';
import type {
  Category,
  CategoryRatingItem,
  CategoryRatingTotal,
  DistractionFrequency,
  FocusRating,
  FocusRatingTrend,
  InsightSession,
} from '@/types';

function inWindow(session: InsightSession, start: Date, end: Date): boolean {
  return isWithinInterval(parseISO(session.startedAt), { start, end });
}

function avgRating(sessions: InsightSession[]): { avg: number | null; sampleSize: number } {
  const ratings = sessions.map((s) => s.focusRating).filter((r): r is FocusRating => r !== null);
  if (ratings.length === 0) return { avg: null, sampleSize: 0 };
  return {
    avg: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
    sampleSize: ratings.length,
  };
}

export function getTopDistractions(
  sessions: InsightSession[],
  days = 14,
  today: Date = new Date(),
): DistractionFrequency[] {
  const start = subDays(startOfDay(today), days - 1);

  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (!inWindow(session, start, today)) continue;
    for (const tagId of session.distractionTags) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tagId, count]) => ({ tagId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export function getFocusRatingTrend(
  sessions: InsightSession[],
  days = 7,
  today: Date = new Date(),
): FocusRatingTrend {
  const recentStart = subDays(startOfDay(today), days - 1);
  const previousEnd = endOfDay(subDays(recentStart, 1));
  const previousStart = startOfDay(subDays(previousEnd, days - 1));

  const recentSessions = sessions.filter((s) => inWindow(s, recentStart, today));
  const previousSessions = sessions.filter((s) => inWindow(s, previousStart, previousEnd));

  const recent = avgRating(recentSessions);
  const previous = avgRating(previousSessions);

  return {
    recentAvg: recent.avg,
    previousAvg: previous.avg,
    sampleSize: recent.sampleSize,
  };
}

export function getCategoryFocusRatings(
  totals: CategoryRatingTotal[],
  categories: Category[],
  minSamples = 3,
): CategoryRatingItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  return totals
    .filter((t) => t.count >= minSamples && categoryMap.has(t.categoryId))
    .map((t) => ({
      categoryId: t.categoryId,
      categoryName: categoryMap.get(t.categoryId)!.name,
      avgRating: t.sum / t.count,
      sampleSize: t.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

export function getLowestRatingDayOfWeek(
  sessions: InsightSession[],
  today: Date = new Date(),
): string | null {
  const start = subDays(startOfDay(today), 29);
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);

  for (const session of sessions) {
    if (session.focusRating === null) continue;
    if (!inWindow(session, start, today)) continue;
    const day = parseISO(session.startedAt).getDay();
    sums[day] += session.focusRating;
    counts[day] += 1;
  }

  let lowestDay = -1;
  let lowestAvg = Infinity;
  for (let day = 0; day < 7; day++) {
    if (counts[day] === 0) continue;
    const avg = sums[day] / counts[day];
    if (avg < lowestAvg) {
      lowestAvg = avg;
      lowestDay = day;
    }
  }

  return lowestDay === -1 ? null : `${DAY_NAMES[lowestDay]}요일`;
}
