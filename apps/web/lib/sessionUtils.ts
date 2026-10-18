import {
  formatCount,
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
} from '@pomoroutine/shared';

export {
  formatCount,
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
};

export function localDayStartIso(dateKey: string, offsetDays = 0): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day + offsetDays).toISOString();
}

export function getDateFilterRange(
  dateFrom: string,
  dateTo: string,
): { startIso?: string; endIso?: string } {
  return {
    startIso: dateFrom ? localDayStartIso(dateFrom) : undefined,
    endIso: dateTo ? localDayStartIso(dateTo, 1) : undefined,
  };
}

export function getMonthRange(
  year: number,
  monthIndex: number,
): { startIso: string; endIso: string } {
  return {
    startIso: new Date(year, monthIndex, 1).toISOString(),
    endIso: new Date(year, monthIndex + 1, 1).toISOString(),
  };
}
