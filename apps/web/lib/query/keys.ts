export const sessionKeys = {
  all: ['sessions'] as const,
  summary: (timezone: string) => ['sessions', 'summary', timezone] as const,
  range: (startIso: string, endIso: string) => ['sessions', 'range', startIso, endIso] as const,
};
