import type { SessionListFilters } from '@/types';

export const sessionKeys = {
  all: ['sessions'] as const,
  summary: (timezone: string) => ['sessions', 'summary', timezone] as const,
  range: (startIso: string, endIso: string) => ['sessions', 'range', startIso, endIso] as const,
  lists: ['sessions', 'list'] as const,
  list: (filters: SessionListFilters) => ['sessions', 'list', filters] as const,
  months: ['sessions', 'month'] as const,
  month: (startIso: string) => ['sessions', 'month', startIso] as const,
  markedDates: (startIso: string) => ['sessions', 'marked-dates', startIso] as const,
  insights: (startIso: string) => ['sessions', 'insights', startIso] as const,
  journalSummary: ['sessions', 'journal-summary'] as const,
};
