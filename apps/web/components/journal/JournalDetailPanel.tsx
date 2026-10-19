'use client';

import { getSessionOrdinalTitle } from '@pomoroutine/shared';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTasks, useCategories } from '@/hooks/useTasks';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FocusRatingPicker } from '@/components/shared/FocusRatingPicker';
import { DistractionTagPicker } from '@/components/shared/DistractionTagPicker';
import { MemoTextarea } from '@/components/shared/MemoTextarea';
import { SessionDetailHeader } from '@/components/journal/SessionDetailHeader';
import { SessionStatsRow } from '@/components/journal/SessionStatsRow';
import { SessionTaskReassignModal } from '@/components/journal/SessionTaskReassignModal';
import { useSessionMutations } from '@/hooks/useSessionMutations';
import type { Category, FocusRating, Session, Task } from '@/types';

interface Props {
  session: Session;
  sessionIndex: number;
  task: Task | null;
  category: Category | null;
  onBack?: () => void;
  onUpdated: (patch: Partial<Session>) => void;
  onDeleted: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface EditDraft {
  title: string;
  taskId: string | null;
  focusRating: FocusRating | null;
  distractionTags: string[];
  note: string;
}

export function JournalDetailPanel({
  session,
  sessionIndex,
  task,
  category,
  onBack,
  onUpdated,
  onDeleted,
  onDirtyChange,
}: Props) {
  const { updateSession, deleteSession } = useSessionMutations();
  const tasks = useTasks();
  const categories = useCategories();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [initialDraft, setInitialDraft] = useState<EditDraft | null>(null);
  const isDirty = isEditing && JSON.stringify(draft) !== JSON.stringify(initialDraft);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const displayTitle =
    session.title ?? task?.title ?? getSessionOrdinalTitle(session.startedAt, sessionIndex);
  const hasRealTitle = session.title !== null || task !== null;
  const taskTitles = [...new Set(tasks.map((t) => t.title))];

  const editingTask = isEditing ? (tasks.find((t) => t.id === draft?.taskId) ?? null) : task;
  const editingCategory = isEditing
    ? (categories.find((c) => c.id === editingTask?.categoryId) ?? null)
    : category;

  function handleEdit() {
    const initial = {
      title: displayTitle,
      taskId: session.taskId,
      focusRating: session.focusRating,
      distractionTags: session.distractionTags,
      note: session.note ?? '',
    };
    setDraft(initial);
    setInitialDraft(initial);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setDraft(null);
  }

  function handleSaveEdit() {
    if (!draft) return;
    const patch = {
      title: draft.title.trim() || null,
      taskId: draft.taskId,
      focusRating: draft.focusRating,
      distractionTags: draft.distractionTags,
      note: draft.note.trim() || null,
    };
    const previous = {
      title: session.title,
      taskId: session.taskId,
      focusRating: session.focusRating,
      distractionTags: session.distractionTags,
      note: session.note,
    };
    updateSession({ id: session.id, patch }, { onError: () => onUpdated(previous) });
    onUpdated(patch);
    setIsEditing(false);
    setDraft(null);
  }

  function handleDelete() {
    deleteSession(session.id);
    onDeleted();
  }

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </button>
      )}

      <SessionDetailHeader
        session={session}
        category={editingCategory}
        displayTitle={displayTitle}
        hasRealTitle={hasRealTitle}
        taskTitles={taskTitles}
        isEditing={isEditing}
        draftTitle={draft?.title ?? ''}
        onDraftTitleChange={(v) => setDraft((d) => (d ? { ...d, title: v } : d))}
        onEdit={handleEdit}
        onDelete={() => setConfirmDelete(true)}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
      />

      <div className="border-t border-border" />

      {/* Task Section — 편집 모드에서만 노출 */}
      {isEditing && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            작업
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-foreground truncate min-w-0">
              {editingTask?.title ?? '미분류'}
            </span>
            <button
              type="button"
              onClick={() => setShowTaskPicker(true)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              변경
            </button>
          </div>
        </div>
      )}

      {/* Focus Rating Section */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          집중도
        </span>
        <FocusRatingPicker
          value={isEditing ? (draft?.focusRating ?? null) : session.focusRating}
          onChange={(rating) => setDraft((d) => (d ? { ...d, focusRating: rating } : d))}
          disabled={!isEditing}
        />
      </div>

      {/* Distraction Tags Section */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          방해요소
        </span>
        <DistractionTagPicker
          value={isEditing ? (draft?.distractionTags ?? []) : session.distractionTags}
          onChange={(tags) => setDraft((d) => (d ? { ...d, distractionTags: tags } : d))}
          disabled={!isEditing}
        />
      </div>

      <div className="border-t border-border" />

      {/* Note Section */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          메모
        </span>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <MemoTextarea
              value={draft?.note ?? ''}
              onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
              placeholder="메모를 남겨보세요..."
              className="flex-1 min-h-0 w-full resize-none rounded-lg bg-muted/50 dark:bg-muted/50 border-border px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-border focus-visible:ring-1 focus-visible:ring-primary"
            />
            <span className="text-xs text-muted-foreground self-end">
              {draft?.note.length ?? 0} / 500
            </span>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/40 px-3.5 py-3">
            {session.note ? (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {session.note}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">메모가 없어요</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      <SessionStatsRow session={session} />

      <ConfirmDialog
        open={confirmDelete}
        title="기록을 삭제할까요?"
        description="삭제한 기록은 복구할 수 없어요."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {showTaskPicker && (
        <SessionTaskReassignModal
          selectedTaskId={draft?.taskId ?? null}
          onSelect={(taskId) => setDraft((d) => (d ? { ...d, taskId } : d))}
          onClose={() => setShowTaskPicker(false)}
        />
      )}
    </div>
  );
}
