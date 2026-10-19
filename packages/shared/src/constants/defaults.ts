import type { TimerSettings } from '../types/timer';
import type { Category } from '../types/task';

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  totalCycles: 4,
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: '공부', color: '#3b82f6' },
  { id: '2', name: '업무', color: '#22c55e' },
  { id: '3', name: '운동', color: '#f97316' },
  { id: '4', name: '독서', color: '#a855f7' },
  { id: '5', name: '기타', color: '#6b7280' },
];
