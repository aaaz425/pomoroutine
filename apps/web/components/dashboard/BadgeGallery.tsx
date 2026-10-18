'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import {
  BADGE_CATEGORY_LABELS,
  BADGE_DEFINITIONS,
  type BadgeCategory,
} from '@/lib/constants/badges';
import { BadgeMedal } from '@/components/dashboard/BadgeMedal';
import { EmptyState } from '@/components/shared/EmptyState';

interface Props {
  earnedIds: Set<string>;
}

const CATEGORY_ORDER: BadgeCategory[] = ['streak', 'total-time', 'diversity', 'special'];

export function BadgeGallery({ earnedIds }: Props) {
  const [expanded, setExpanded] = useState(false);

  const earnedCount = earnedIds.size;
  const earnedBadges = BADGE_DEFINITIONS.filter((b) => earnedIds.has(b.id));

  return (
    <div className="flex flex-col gap-4 p-5 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">뱃지 컬렉션</p>
        <span className="text-xs text-muted-foreground">
          {earnedCount}/{BADGE_DEFINITIONS.length} 획득
        </span>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((category) => (
            <div key={category} className="flex flex-col gap-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                {BADGE_CATEGORY_LABELS[category]}
              </p>
              <div className="flex flex-wrap gap-3">
                {BADGE_DEFINITIONS.filter((b) => b.category === category).map((badge) => (
                  <BadgeMedal key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : earnedBadges.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {earnedBadges.map((badge) => (
            <BadgeMedal key={badge.id} badge={badge} earned />
          ))}
        </div>
      ) : (
        <EmptyState message="아직 획득한 뱃지가 없어요" messageClassName="text-xs" />
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center justify-center gap-1 self-center text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? '접기' : '뱃지 모두 보기'}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
