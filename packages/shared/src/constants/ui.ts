import type { SoundType } from '../types/settings';

export const MESSAGE_ROTATE_INTERVAL_MS = 5000;

export const ABANDONED_CHECK_INTERVAL_MS = 30 * 1000;

export const SOUND_SEQUENCE_INTERVAL_MS = 1900;

export const ACTIVE_TIMER_STORAGE_KEY = 'pomoroutine:active-timer';

export const CATEGORY_PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: '#3b82f6', label: '파란색' },
  { hex: '#22c55e', label: '초록색' },
  { hex: '#f97316', label: '주황색' },
  { hex: '#a855f7', label: '보라색' },
  { hex: '#ef4444', label: '빨간색' },
  { hex: '#ec4899', label: '분홍색' },
  { hex: '#eab308', label: '노란색' },
];

export const SOUND_TYPE_LABELS: Record<SoundType, string> = {
  sine: '기본',
  chime: '차임',
  bell: '벨',
  digital: '디지털',
};
