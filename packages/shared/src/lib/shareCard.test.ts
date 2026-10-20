import { describe, expect, it } from 'vitest';

import { buildHeadline, buildShareCardData } from './shareCard';

describe('buildHeadline', () => {
  it('집중 여부와 스트릭 구간별 문구', () => {
    expect(buildHeadline(0, 0)).toBe('아직 집중 기록이 없어요');
    expect(buildHeadline(0, 1500)).toBe('집중을 시작했어요');
    expect(buildHeadline(2, 1500)).toBe('오늘도 집중했어요');
    expect(buildHeadline(3, 1500)).toBe('꾸준함이 쌓이고 있어요 ✨');
    expect(buildHeadline(6, 1500)).toBe('꾸준함이 쌓이고 있어요 ✨');
    expect(buildHeadline(7, 1500)).toBe('일주일 넘게 이어가는 중이에요 🔥');
  });
});

describe('buildShareCardData', () => {
  it('기간 합계와 스트릭으로 카드 데이터를 만들고 집중이 없으면 0분', () => {
    const today = new Date('2024-03-15T12:00:00');
    const data = buildShareCardData({ focusSeconds: 5400, count: 3 }, 3, 'week', today);
    expect(data.totalFocusLabel).toBe('1시간 30분');
    expect(data.sessionCount).toBe(3);
    expect(data.streakDays).toBe(3);
    expect(
      buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'today', today).totalFocusLabel,
    ).toBe('0분');
  });
});
