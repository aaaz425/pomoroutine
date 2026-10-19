import { describe, expect, it } from 'vitest';

import { isSessionStale } from './sessionStale';

const NOW = new Date('2024-01-01T12:00:00.000Z').getTime();
const THRESHOLD_MS = 25 * 60 * 1000;

const stale = (lastActiveAt: number | null, sessionStartedAt: number | null) =>
  isSessionStale({ lastActiveAt, sessionStartedAt, thresholdMs: THRESHOLD_MS }, NOW);

describe('isSessionStale', () => {
  it('마지막 활동이 임계값까지는 false, 넘으면 true', () => {
    expect(stale(NOW - THRESHOLD_MS, NOW - THRESHOLD_MS)).toBe(false);
    expect(stale(NOW - THRESHOLD_MS - 1, NOW - THRESHOLD_MS - 1)).toBe(true);
  });

  it('마지막 활동 시각이 없으면 세션 시작 시각으로 판단', () => {
    expect(stale(null, NOW - THRESHOLD_MS - 1)).toBe(true);
  });

  it('둘 다 없으면 false', () => {
    expect(stale(null, null)).toBe(false);
  });
});
