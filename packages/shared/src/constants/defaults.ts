import type { TimerSettings } from '../types/timer';
import type { Category } from '../types/task';
import type { AppSettings } from '../types/settings';
import { MOTIVATIONAL_MESSAGES } from './messages';

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  totalCycles: 4,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  nickname: '',
  browserNotification: false,
  soundAlert: true,
  soundType: 'sine',
  soundVolume: 70,
  soundRepeatCount: 2,
  motivationalMessages: MOTIVATIONAL_MESSAGES,
  defaultTimerSettings: DEFAULT_TIMER_SETTINGS,
  keepScreenAwake: false,
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: '공부', color: '#3b82f6' },
  { id: '2', name: '업무', color: '#22c55e' },
  { id: '3', name: '운동', color: '#f97316' },
  { id: '4', name: '독서', color: '#a855f7' },
  { id: '5', name: '기타', color: '#6b7280' },
];
