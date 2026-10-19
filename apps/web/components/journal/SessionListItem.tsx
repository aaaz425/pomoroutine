'use client';

import {
  formatDuration,
  formatSessionTimeSummary,
  getSessionOrdinalTitle,
} from '@pomoroutine/shared';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { Badge } from '@/components/shared/Badge';
import { FOCUS_RATING_LABELS } from '@/lib/constants';
import type { Category, Session, Task } from '@/types';

interface Props {
  session: Session;
  task: Task | null;
  category: Category | null;
  sessionIndex: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function SessionListItem({
  session,
  task,
  category,
  sessionIndex,
  isSelected,
  onSelect,
}: Props) {
  const displayTitle =
    session.title ?? task?.title ?? getSessionOrdinalTitle(session.startedAt, sessionIndex);
  const hasRealTitle = session.title !== null || task !== null;
  const timeRange = formatSessionTimeSummary(
    session.startedAt,
    session.endedAt,
    session.focusPeriods,
  );
  const duration = formatDuration(session.focusSeconds);

  return (
    <button
      onClick={onSelect}
      className={[
        'w-full text-left flex flex-col gap-1.5 px-3.5 py-3 rounded-lg border transition-colors',
        isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/40',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-medium truncate ${hasRealTitle ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {displayTitle}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{timeRange}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {category ? (
          <CategoryBadge category={category} />
        ) : (
          <Badge className="rounded-md font-medium bg-muted text-muted-foreground">기타</Badge>
        )}
        {session.focusRating && (
          <Badge className="rounded-md font-medium bg-primary/10 text-primary">
            {FOCUS_RATING_LABELS[session.focusRating]}
          </Badge>
        )}
        <span className="text-[11px] text-muted-foreground">{duration}</span>
      </div>
    </button>
  );
}
