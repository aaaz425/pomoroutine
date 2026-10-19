'use client';

import { useState } from 'react';
import { Tag } from 'lucide-react';
import { useCategories, useTaskActions } from '@/hooks/useTasks';
import { CategoryPills } from '@/components/shared/CategoryPills';
import { CategoryModal } from '@/components/settings/category/CategoryModal';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/shared/Modal';
import { TextInput } from '@/components/shared/TextInput';
import { INPUT_LIMITS } from '@/lib/constants/limits';
import type { Task } from '@/types';

interface Props {
  task: Task | null; // null = 새 작업
  onClose: () => void;
  onCreated?: (id: string) => void; // 새 작업 생성 시에만 호출 (선택 모드에서 자동 선택용)
}

export function TaskFormModal({ task, onClose, onCreated }: Props) {
  const categories = useCategories();
  const { addTask, updateTask } = useTaskActions();

  const [initial] = useState(() => ({
    title: task?.title ?? '',
    categoryId: task?.categoryId ?? categories[0]?.id ?? '',
  }));
  const [title, setTitle] = useState(initial.title);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const dirty = title !== initial.title || categoryId !== initial.categoryId;
  // 저장이 비동기(Supabase 왕복)라 이게 없으면 응답 오기 전에 다시 눌러 중복 생성될 수 있음
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);

    if (task === null) {
      const newId = await addTask({ title: trimmed, categoryId });
      if (newId) onCreated?.(newId);
    } else {
      await updateTask(task.id, { title: trimmed, categoryId });
    }
    onClose();
  }

  return (
    <>
      <Modal
        title={task ? '작업 수정' : '새 작업 추가'}
        onClose={onClose}
        dirty={dirty}
        backdropClassName="bg-black/55 backdrop-blur-sm"
        maxHeightClassName="max-h-[80vh]"
        footer={
          <>
            <Button onClick={onClose} variant="secondary" size="lg" className="px-4">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              variant="default"
              size="lg"
              className="px-4 font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {task ? '저장' : '추가'}
            </Button>
          </>
        }
      >
        {/* 작업 제목 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-title" className="text-xs font-medium text-muted-foreground">
            작업 제목
          </label>
          <TextInput
            id="task-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="예) 알고리즘 문제 풀기"
            className="w-full"
            maxLength={INPUT_LIMITS.TITLE_MAX_LENGTH}
          />
        </div>

        {/* 카테고리 */}
        <div className="flex flex-col gap-2" role="group" aria-labelledby="task-category-label">
          <div className="flex items-center justify-between">
            <span id="task-category-label" className="text-xs font-medium text-muted-foreground">
              카테고리
            </span>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Tag className="w-3 h-3" />
              편집
            </button>
          </div>
          <CategoryPills
            variant="rich"
            categories={categories}
            selectedId={categoryId}
            onChange={setCategoryId}
          />
        </div>
      </Modal>

      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} />}
    </>
  );
}
