'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useCategories } from '@/hooks/useTasks';
import { Badge } from '@/components/shared/Badge';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import type { Task } from '@/types';
import { DragHandle } from '@/components/shared/DragHandle';

interface Props {
  task: Task;
  mode: 'select' | 'manage';
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDeleteRequest?: (id: string) => void;
}

export function TaskItem({
  task,
  mode,
  isSelected = false,
  onSelect,
  onEdit,
  onDeleteRequest,
}: Props) {
  const categories = useCategories();
  const category = categories.find((c) => c.id === task.categoryId);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: mode !== 'manage',
  });

  const style = {
    transform: transform ? `translate3d(0px, ${transform.y}px, 0px)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role={mode === 'select' ? 'button' : undefined}
      tabIndex={mode === 'select' ? 0 : undefined}
      aria-pressed={mode === 'select' ? isSelected : undefined}
      onClick={mode === 'select' ? () => onSelect?.(task.id) : undefined}
      onKeyDown={
        mode === 'select'
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(task.id);
              }
            }
          : undefined
      }
      className={[
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg group transition-colors',
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
        isDragging ? 'opacity-50 scale-[0.98]' : '',
      ].join(' ')}
    >
      {/* drag handle — 관리 모드에서만 */}
      {mode === 'manage' && <DragHandle attributes={attributes} listeners={listeners} />}

      {/* 선택 인디케이터 — 선택 모드 */}
      {mode === 'select' && (
        <div
          className={[
            'shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors',
            isSelected ? 'bg-primary' : 'border-2 border-border',
          ].join(' ')}
        >
          {isSelected && (
            <svg viewBox="0 0 10 8" className="w-2.5 h-2.5">
              <path
                d="M1 4l3 3 5-6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              />
            </svg>
          )}
        </div>
      )}

      {/* 카테고리 */}
      {category && <CategoryBadge category={category} className="shrink-0" />}

      {/* 제목 */}
      <span
        className={[
          'flex-1 text-sm leading-snug truncate',
          isSelected ? 'text-primary font-medium' : 'text-foreground',
        ].join(' ')}
      >
        {task.title}
      </span>

      {/* 선택됨 뱃지 — 선택 모드 */}
      {mode === 'select' && isSelected && (
        <Badge className="shrink-0 rounded text-[10px] font-semibold bg-primary text-primary-foreground">
          선택됨
        </Badge>
      )}

      {/* 수정/삭제 — 관리 모드 */}
      {mode === 'manage' && (
        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(task);
            }}
            aria-label="수정"
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest?.(task.id);
            }}
            aria-label="삭제"
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
