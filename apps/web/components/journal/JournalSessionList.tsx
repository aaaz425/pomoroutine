'use client';

import { formatDuration } from '@pomoroutine/shared';
import { SessionListItem } from '@/components/journal/SessionListItem';
import type { Category, Session, SessionGroup, Task } from '@/types';

interface Props {
  groups: SessionGroup[];
  tasks: Task[];
  categories: Category[];
  selectedId: string | null;
  onSelect: (session: Session, sessionIndex: number) => void;
}

export function JournalSessionList({ groups, tasks, categories, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.dateKey} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{group.displayLabel}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(group.dateKey).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDuration(group.totalFocusSeconds)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {group.sessions.map((session, displayIdx) => {
              const task = tasks.find((t) => t.id === session.taskId) ?? null;
              const category = task
                ? (categories.find((c) => c.id === task.categoryId) ?? null)
                : null;
              const sessionIndex = group.sessions.length - 1 - displayIdx;
              return (
                <SessionListItem
                  key={session.id}
                  session={session}
                  task={task}
                  category={category}
                  sessionIndex={sessionIndex}
                  isSelected={selectedId === session.id}
                  onSelect={() => onSelect(session, sessionIndex)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
