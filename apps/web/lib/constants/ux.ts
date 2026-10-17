export const MESSAGE_ROTATE_INTERVAL_MS = 5000;

// hydration이 이 시간 안에 끝나면 스켈레톤을 건너뛴다 — 빠른 연결에서 스켈레톤이 한 프레임 반짝이는 것 방지
export const SKELETON_SHOW_DELAY_MS = 200;

export const SOUND_SEQUENCE_INTERVAL = 1.9;

export const DRAG_ACTIVATION_DISTANCE_PX = 5;

import type { SoundType } from '@/types/models';

export const SOUND_TYPE_LABELS: Record<SoundType, string> = {
  sine: '기본',
  chime: '차임',
  bell: '벨',
  digital: '디지털',
};
