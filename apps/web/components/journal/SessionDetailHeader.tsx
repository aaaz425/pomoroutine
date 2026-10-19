import {
  formatTimeRange,
  formatFocusPeriodRanges,
  formatFullDate,
  hasAbnormalFocusGap,
} from '@pomoroutine/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { SessionTitleInput } from '@/components/journal/SessionTitleInput';
import type { Category, Session } from '@/types';

interface Props {
  session: Session;
  category: Category | null;
  displayTitle: string;
  hasRealTitle: boolean;
  taskTitles: string[];
  isEditing: boolean;
  draftTitle: string;
  onDraftTitleChange: (value: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function SessionDetailHeader({
  session,
  category,
  displayTitle,
  hasRealTitle,
  taskTitles,
  isEditing,
  draftTitle,
  onDraftTitleChange,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        {category && <CategoryBadge category={category} className="self-start" />}
        <div className="ml-auto shrink-0">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                취소
              </button>
              <button
                onClick={onSaveEdit}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                aria-label="편집"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                aria-label="기록 삭제"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <SessionTitleInput
          value={draftTitle}
          onChange={onDraftTitleChange}
          taskTitles={taskTitles}
        />
      ) : (
        <h2
          className={`text-xl font-bold tracking-tight ${!hasRealTitle ? 'text-muted-foreground' : 'text-foreground'}`}
        >
          {displayTitle}
        </h2>
      )}

      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{formatFullDate(session.startedAt)}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>
          {hasAbnormalFocusGap(session.focusPeriods)
            ? formatFocusPeriodRanges(session.focusPeriods)
            : formatTimeRange(session.startedAt, session.endedAt)}
        </span>
      </div>
    </div>
  );
}
