import { describe, it, expect } from 'vitest';
import { toAppSettings, toTask } from './supabaseData';

describe('toTask', () => {
  const row = {
    id: 't1',
    title: '알고리즘',
    category_id: 'c1',
    created_at: '2026-01-01T00:00:00.000Z',
  };

  it('row를 camelCase Task로 변환함', () => {
    expect(toTask(row)).toEqual({
      id: 't1',
      title: '알고리즘',
      categoryId: 'c1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('검증 실패면 null', () => {
    expect(toTask({ ...row, title: 'a'.repeat(1000) })).toBeNull();
  });
});

describe('toAppSettings', () => {
  const row = {
    nickname: '유진',
    browser_notification: true,
    sound_alert: false,
    sound_type: 'chime',
    sound_volume: 33,
    sound_repeat_count: 4,
    motivational_messages: ['메시지1'],
    default_focus_minutes: 50,
    default_short_break_minutes: 10,
    default_total_cycles: 3,
    keep_screen_awake: true,
  };

  it('row를 camelCase AppSettings로 변환함', () => {
    expect(toAppSettings(row)).toEqual({
      nickname: '유진',
      browserNotification: true,
      soundAlert: false,
      soundType: 'chime',
      soundVolume: 33,
      soundRepeatCount: 4,
      motivationalMessages: ['메시지1'],
      defaultTimerSettings: { focusMinutes: 50, shortBreakMinutes: 10, totalCycles: 3 },
      keepScreenAwake: true,
    });
  });
});
