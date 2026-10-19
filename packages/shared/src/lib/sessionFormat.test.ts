import { describe, expect, it } from 'vitest';
import { formatStartedAtLabel } from './sessionFormat';

const NOW = new Date(2024, 0, 2, 16, 30).getTime();

describe('formatStartedAtLabel', () => {
  it('오늘 시작했으면 시각만 표시', () => {
    expect(formatStartedAtLabel(new Date(2024, 0, 2, 15, 52).getTime(), NOW)).toBe('오후 3:52');
  });

  it('어제 시작했으면 어제를 붙임', () => {
    expect(formatStartedAtLabel(new Date(2024, 0, 1, 9, 5).getTime(), NOW)).toBe('어제 오전 9:05');
  });

  it('그 이전이면 날짜를 붙임', () => {
    expect(formatStartedAtLabel(new Date(2023, 11, 30, 21, 0).getTime(), NOW)).toBe(
      '12월 30일 오후 9:00',
    );
  });
});
