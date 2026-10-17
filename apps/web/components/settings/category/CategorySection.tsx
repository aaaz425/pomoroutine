'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useTaskStore } from '@/store/StoreProvider';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CategoryEditModal } from '@/components/settings/category/CategoryEditModal';
import type { Category } from '@/types';

import { INPUT_LIMITS } from '@/lib/constants/limits';
import { DragHandle } from '@/components/shared/DragHandle';
import { useDragSensors } from '@/hooks/useDragSensors';

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: transform ? `translate3d(0px, ${transform.y}px, 0px)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center justify-between py-2.5 px-1 group border-b border-border/50 last:border-0',
        isDragging ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <DragHandle attributes={attributes} listeners={listeners} />
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <span className="text-sm text-foreground truncate min-w-0">{category.name}</span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          aria-label={`${category.name} 편집`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label={`${category.name} 삭제`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CategorySection() {
  const categories = useTaskStore((s) => s.categories);
  const deleteCategory = useTaskStore((s) => s.deleteCategory);
  const reorderCategories = useTaskStore((s) => s.reorderCategories);
  const isAtLimit = categories.length >= INPUT_LIMITS.CATEGORIES_MAX;

  const [editTarget, setEditTarget] = useState<Category | 'new' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const sensors = useDragSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderCategories(String(active.id), String(over.id));
    }
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    void deleteCategory(deleteTargetId);
    setDeleteTargetId(null);
  }

  return (
    <>
      <DndContext
        id="categories"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col max-h-[312px] overflow-y-auto">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onEdit={() => setEditTarget(cat)}
                onDelete={() => setDeleteTargetId(cat.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => !isAtLimit && setEditTarget('new')}
          disabled={isAtLimit}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          카테고리 추가
        </button>
        <span
          className={`text-xs ${isAtLimit ? 'text-destructive/70' : 'text-muted-foreground/70'}`}
        >
          {categories.length} / {INPUT_LIMITS.CATEGORIES_MAX}
        </span>
      </div>

      {editTarget !== null && (
        <CategoryEditModal
          category={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="카테고리 삭제"
        description="삭제한 카테고리는 복구할 수 없습니다. 해당 카테고리를 사용 중인 작업에서는 카테고리가 표시되지 않습니다."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
}
