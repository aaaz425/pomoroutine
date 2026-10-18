import { describe, expect, it } from 'vitest';

import { buildHeadline, buildShareCardData } from './shareCard';

const TODAY = new Date('2024-03-15T12:00:00');

describe('buildHeadline', () => {
  it('집중 기록이 없으면 안내 문구', () => {
    expect(buildHeadline(0, 0)).toBe('아직 집중 기록이 없어요');
  });

  it('스트릭 0인데 이번 기간엔 집중했으면 시작 문구', () => {
    expect(buildHeadline(0, 1500)).toBe('집중을 시작했어요');
  });

  it('스트릭 1~2일이면 오늘도 집중 문구', () => {
    expect(buildHeadline(1, 1500)).toBe('오늘도 집중했어요');
    expect(buildHeadline(2, 1500)).toBe('오늘도 집중했어요');
  });

  it('스트릭 3~6일이면 꾸준함 문구', () => {
    expect(buildHeadline(3, 1500)).toBe('꾸준함이 쌓이고 있어요 ✨');
    expect(buildHeadline(6, 1500)).toBe('꾸준함이 쌓이고 있어요 ✨');
  });

  it('스트릭 7일 이상이면 불꽃 문구', () => {
    expect(buildHeadline(7, 1500)).toBe('일주일 넘게 이어가는 중이에요 🔥');
  });
});

describe('buildShareCardData', () => {
  it('세션이 없으면 0/기본값 반환', () => {
    const data = buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'today', TODAY);
    expect(data.totalFocusLabel).toBe('0분');
    expect(data.sessionCount).toBe(0);
    expect(data.streakDays).toBe(0);
    expect(data.headline).toBe('아직 집중 기록이 없어요');
  });

  it('탭별 periodLabel 매핑', () => {
    expect(buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'today', TODAY).periodLabel).toBe(
      '오늘',
    );
    expect(buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'week', TODAY).periodLabel).toBe(
      '이번 주',
    );
    expect(buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'month', TODAY).periodLabel).toBe(
      '이번 달',
    );
    expect(buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'all', TODAY).periodLabel).toBe(
      '전체',
    );
  });

  it('기간 합계와 스트릭을 그대로 반영', () => {
    const data = buildShareCardData({ focusSeconds: 5400, count: 3 }, 3, 'week', TODAY);
    expect(data.streakDays).toBe(3);
    expect(data.sessionCount).toBe(3);
    expect(data.totalFocusLabel).toBe('1시간 30분');
    expect(data.headline).toBe('꾸준함이 쌓이고 있어요 ✨');
  });

  it('generatedAtLabel은 yyyy.MM.dd 형식', () => {
    const data = buildShareCardData({ focusSeconds: 0, count: 0 }, 0, 'today', TODAY);
    expect(data.generatedAtLabel).toBe('2024.03.15');
  });
});
