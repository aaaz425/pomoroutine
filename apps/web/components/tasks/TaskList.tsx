'use client';

import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useTasks, useTaskActions } from '@/hooks/useTasks';
import { useDelayedHydration } from '@/hooks/useDelayedHydration';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import type { Task } from '@/types';
import { useDragSensors } from '@/hooks/useDragSensors';

interface Props {
  mode: 'select' | 'manage';
  selectedTaskId?: string | null;
  onSelect?: (id: string) => void;
  listClassName?: string;
  emptyStateClassName?: string;
}

export function TaskList({
  mode,
  selectedTaskId = null,
  onSelect,
  listClassName,
  emptyStateClassName = 'py-4',
}: Props) {
  const { hydrated, showSkeleton } = useDelayedHydration();
  const tasks = useTasks();
  const { reorderTasks, deleteTask } = useTaskActions();

  const [editTarget, setEditTarget] = useState<Task | 'new' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const sensors = useDragSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTasks(
        tasks.findIndex((t) => t.id === active.id),
        tasks.findIndex((t) => t.id === over.id),
      );
    }
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    void deleteTask(deleteTargetId);
    setDeleteTargetId(null);
  }

  function handleCreated(id: string) {
    if (mode === 'select') onSelect?.(id);
  }

  return (
    <>
      {!hydrated ? (
        showSkeleton && (
          <div className={listClassName ?? 'flex flex-col gap-1'}>
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        )
      ) : tasks.length === 0 ? (
        <EmptyState message="작업이 없습니다" className={emptyStateClassName} />
      ) : (
        <DndContext
          id="task-list"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className={listClassName ?? 'flex flex-col gap-1 max-h-[308px] overflow-y-auto'}>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  mode={mode}
                  isSelected={task.id === selectedTaskId}
                  onSelect={onSelect}
                  onEdit={setEditTarget}
                  onDeleteRequest={setDeleteTargetId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        type="button"
        disabled={!hydrated}
        onClick={() => setEditTarget('new')}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />새 작업 추가
      </button>

      {editTarget !== null && (
        <TaskFormModal
          task={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onCreated={handleCreated}
        />
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="작업 삭제"
        description="삭제한 작업은 복구할 수 없습니다."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
}
