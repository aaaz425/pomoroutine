'use client';

import { createStore } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from '@/lib/toast';
import { createMutationTracker } from '@pomoroutine/shared';
import { generateId } from '@/lib/utils';
import { INPUT_LIMITS } from '@/lib/constants/limits';
import {
  fetchTasks,
  insertTask as insertTaskRow,
  updateTask as updateTaskRow,
  deleteTask as deleteTaskRow,
  reorderTasks as reorderTasksRows,
} from '@/lib/supabase/tasks';
import {
  fetchCategories,
  insertCategory as insertCategoryRow,
  updateCategory as updateCategoryRow,
  deleteCategory as deleteCategoryRow,
  reorderCategories as reorderCategoriesRows,
} from '@/lib/supabase/categories';
import { type Task, type Category, DEFAULT_CATEGORIES } from '@/types';
import { TOAST_MESSAGES } from '@/lib/constants/messages';

type PendingIds = Map<string, Promise<string | null>>;

// tempId 생성 중 update/delete가 겹치면 나중 도착한 insert reconcile이 그 변경을 덮어쓰므로, 생성이 끝날 때까지 기다렸다가 실제 DB id로 동작한다
function trackPendingId(pending: PendingIds, tempId: string, promise: Promise<string | null>) {
  pending.set(tempId, promise);
}

function resolvePendingId(pending: PendingIds, id: string): Promise<string | null> {
  return pending.get(id) ?? Promise.resolve(id);
}

interface TaskStore {
  tasks: Task[];
  categories: Category[];

  addTask: (input: { title: string; categoryId: string }) => Promise<string | null>;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'categoryId'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (activeId: string, overId: string) => Promise<void>;
  addCategory: (input: { name: string; color: string }) => Promise<void>;
  updateCategory: (id: string, input: { name: string; color: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (activeId: string, overId: string) => Promise<void>;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const createTaskStore = () => {
  const pendingTaskIds: PendingIds = new Map();
  const pendingCategoryIds: PendingIds = new Map();
  const tracker = createMutationTracker();

  return createStore<TaskStore>()((set, get) => ({
    // SSR hydration mismatch 방지 — 실제 데이터는 hydrate()로 반영
    tasks: [],
    categories: DEFAULT_CATEGORIES,

    addTask: tracker.track(async ({ title, categoryId }) => {
      const trimmed = title.trim();
      const tempId = generateId();
      const optimisticTask: Task = {
        id: tempId,
        title: trimmed,
        categoryId,
        createdAt: new Date().toISOString(),
      };
      // 스냅샷을 직접 set하면 대기 중 다른 변경을 덮어쓰므로 state 콜백으로 최신 상태 위에서 반영
      set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));

      const idPromise = (async () => {
        const inserted = await insertTaskRow({ title: trimmed, categoryId });

        if (!inserted) {
          set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
          toast(TOAST_MESSAGES.taskAddFailed);
          return null;
        }

        set((state) => ({ tasks: state.tasks.map((t) => (t.id === tempId ? inserted : t)) }));
        // 새 작업이 맨 앞으로 온 순서를 position에 반영 — 실패해도 다음 재정렬 때 자연히 맞춰짐
        void reorderTasksRows(get().tasks.map((t) => t.id));
        return inserted.id;
      })();
      trackPendingId(pendingTaskIds, tempId, idPromise);
      return idPromise;
    }),

    updateTask: tracker.track(async (id, patch) => {
      const targetId = await resolvePendingId(pendingTaskIds, id);
      if (!targetId) return;
      const original = get().tasks.find((t) => t.id === targetId);
      if (!original) return;
      const title = patch.title?.trim();
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === targetId ? { ...t, ...patch, title: title ?? t.title } : t,
        ),
      }));
      const { error } = await updateTaskRow(targetId, { ...patch, title });
      if (error) {
        set((state) => ({ tasks: state.tasks.map((t) => (t.id === targetId ? original : t)) }));
        toast(TOAST_MESSAGES.taskSaveFailed);
      }
    }),

    deleteTask: tracker.track(async (id) => {
      const targetId = await resolvePendingId(pendingTaskIds, id);
      if (!targetId) return;
      const index = get().tasks.findIndex((t) => t.id === targetId);
      if (index === -1) return;
      const target = get().tasks[index];
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== targetId) }));
      const { error } = await deleteTaskRow(targetId);
      if (error) {
        set((state) => {
          const tasks = [...state.tasks];
          tasks.splice(Math.min(index, tasks.length), 0, target);
          return { tasks };
        });
        toast(TOAST_MESSAGES.taskDeleteFailed);
      }
    }),

    reorderTasks: tracker.track(async (activeId, overId) => {
      const previousTasks = get().tasks;
      const from = previousTasks.findIndex((t) => t.id === activeId);
      const to = previousTasks.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1) return;
      const next = arrayMove(previousTasks, from, to);
      set({ tasks: next });
      const { error } = await reorderTasksRows(next.map((t) => t.id));
      if (error) {
        set({ tasks: previousTasks });
        toast(TOAST_MESSAGES.reorderFailed);
      }
    }),

    addCategory: tracker.track(async ({ name, color }) => {
      if (get().categories.length >= INPUT_LIMITS.CATEGORIES_MAX) return;
      const trimmed = name.trim();
      const tempId = generateId();
      const position = get().categories.length;
      set((state) => ({
        categories: [...state.categories, { id: tempId, name: trimmed, color }],
      }));

      const idPromise = (async () => {
        const inserted = await insertCategoryRow({ name: trimmed, color, position });
        if (!inserted) {
          set((state) => ({ categories: state.categories.filter((c) => c.id !== tempId) }));
          toast(TOAST_MESSAGES.categoryAddFailed);
          return null;
        }
        set((state) => ({
          categories: state.categories.map((c) => (c.id === tempId ? inserted : c)),
        }));
        return inserted.id;
      })();
      trackPendingId(pendingCategoryIds, tempId, idPromise);
      await idPromise;
    }),

    updateCategory: tracker.track(async (id, { name, color }) => {
      const targetId = await resolvePendingId(pendingCategoryIds, id);
      if (!targetId) return;
      const original = get().categories.find((c) => c.id === targetId);
      if (!original) return;
      const trimmed = name.trim();
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === targetId ? { ...c, name: trimmed, color } : c,
        ),
      }));
      const { error } = await updateCategoryRow(targetId, { name: trimmed, color });
      if (error) {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === targetId ? original : c)),
        }));
        toast(TOAST_MESSAGES.categorySaveFailed);
      }
    }),

    deleteCategory: tracker.track(async (id) => {
      const targetId = await resolvePendingId(pendingCategoryIds, id);
      if (!targetId) return;
      const index = get().categories.findIndex((c) => c.id === targetId);
      if (index === -1) return;

      // 낙관적 삭제 후 DB 제약 위반으로 롤백되면 화면이 깜빡이므로, 로컬 tasks로 미리 걸러 생략(DB 체크는 안전망으로 유지)
      if (get().tasks.some((t) => t.categoryId === targetId)) {
        toast(TOAST_MESSAGES.categoryInUse);
        return;
      }

      const target = get().categories[index];
      set((state) => ({ categories: state.categories.filter((c) => c.id !== targetId) }));
      const { error, blocked } = await deleteCategoryRow(targetId);
      if (error) {
        set((state) => {
          const categories = [...state.categories];
          categories.splice(Math.min(index, categories.length), 0, target);
          return { categories };
        });
        toast(blocked ? TOAST_MESSAGES.categoryInUse : TOAST_MESSAGES.categoryDeleteFailed);
      }
    }),

    reorderCategories: tracker.track(async (activeId, overId) => {
      const previousCategories = get().categories;
      const from = previousCategories.findIndex((c) => c.id === activeId);
      const to = previousCategories.findIndex((c) => c.id === overId);
      if (from === -1 || to === -1) return;
      const next = arrayMove(previousCategories, from, to);
      set({ categories: next });
      const { error } = await reorderCategoriesRows(next.map((c) => c.id));
      if (error) {
        set({ categories: previousCategories });
        toast(TOAST_MESSAGES.reorderFailed);
      }
    }),

    hydrate: async () => {
      const [tasksResult, categoriesResult] = await Promise.all([fetchTasks(), fetchCategories()]);
      set({
        tasks: tasksResult?.tasks ?? [],
        categories: categoriesResult?.categories ?? DEFAULT_CATEGORIES,
      });

      const invalidCount = (tasksResult?.invalidCount ?? 0) + (categoriesResult?.invalidCount ?? 0);
      if (invalidCount > 0) {
        toast(TOAST_MESSAGES.sessionsInvalid(invalidCount));
      }
    },

    refresh: () =>
      tracker.refreshWhenIdle(
        () => Promise.all([fetchTasks(), fetchCategories()]),
        ([tasksResult, categoriesResult]) => {
          set((state) => ({
            tasks: tasksResult?.tasks ?? state.tasks,
            categories: categoriesResult?.categories ?? state.categories,
          }));
        },
      ),
  }));
};

export type TaskStoreApi = ReturnType<typeof createTaskStore>;
export type { TaskStore };
