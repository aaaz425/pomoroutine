import { describe, expect, it } from 'vitest';

import { getDateFilterRange } from './sessionUtils';

describe('getDateFilterRange', () => {
  it('시작일 자정부터 종료일 다음 날 자정 전까지, 비어 있으면 범위 없음', () => {
    expect(getDateFilterRange('2024-03-10', '2024-03-15')).toEqual({
      startIso: new Date(2024, 2, 10).toISOString(),
      endIso: new Date(2024, 2, 16).toISOString(),
    });
    expect(getDateFilterRange('', '')).toEqual({ startIso: undefined, endIso: undefined });
  });
});
