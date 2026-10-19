import type { BadgeTier } from '@pomoroutine/shared';

export type { BadgeIconKey, BadgeCategory, BadgeDefinition } from '@pomoroutine/shared';
export { BADGE_CATEGORY_LABELS, BADGE_DEFINITIONS } from '@pomoroutine/shared';

// 등급별 메달 색상 — 실제 금속/보석 톤을 흉내낸 그라디언트 조합 (Tailwind 클래스라 웹 전용)
export const BADGE_TIER_STYLES: Record<
  BadgeTier,
  { medallion: string; ring: string; ribbon: string }
> = {
  bronze: {
    medallion: 'from-amber-700 via-amber-500 to-amber-800',
    ring: 'ring-amber-900/40',
    ribbon: 'bg-amber-700',
  },
  silver: {
    medallion: 'from-slate-300 via-slate-100 to-slate-400',
    ring: 'ring-slate-400/40',
    ribbon: 'bg-slate-400',
  },
  gold: {
    medallion: 'from-yellow-300 via-amber-400 to-yellow-600',
    ring: 'ring-yellow-600/40',
    ribbon: 'bg-yellow-500',
  },
  platinum: {
    medallion: 'from-cyan-200 via-sky-300 to-indigo-400',
    ring: 'ring-indigo-500/40',
    ribbon: 'bg-indigo-400',
  },
  special: {
    medallion: 'from-fuchsia-400 via-purple-500 to-indigo-600',
    ring: 'ring-purple-600/40',
    ribbon: 'bg-purple-500',
  },
};
