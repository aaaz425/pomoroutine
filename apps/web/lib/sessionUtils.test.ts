import { describe, expect, it } from 'vitest';

import { getDateFilterRange, getMonthRange, localDayStartIso } from './sessionUtils';

describe('로컬 날짜 경계', () => {
  it('날짜 키를 로컬 자정 ISO로 바꿈', () => {
    expect(localDayStartIso('2024-03-15')).toBe(new Date(2024, 2, 15).toISOString());
    expect(localDayStartIso('2024-03-31', 1)).toBe(new Date(2024, 3, 1).toISOString());
  });

  it('날짜 필터는 시작일 자정부터 종료일 다음 날 자정 전까지', () => {
    expect(getDateFilterRange('2024-03-10', '2024-03-15')).toEqual({
      startIso: new Date(2024, 2, 10).toISOString(),
      endIso: new Date(2024, 2, 16).toISOString(),
    });
    expect(getDateFilterRange('', '')).toEqual({ startIso: undefined, endIso: undefined });
  });

  it('월 범위는 그 달 1일부터 다음 달 1일 전까지', () => {
    expect(getMonthRange(2024, 11)).toEqual({
      startIso: new Date(2024, 11, 1).toISOString(),
      endIso: new Date(2025, 0, 1).toISOString(),
    });
  });
});
