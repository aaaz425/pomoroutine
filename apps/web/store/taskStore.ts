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
import {
  fetchAllSessionsLazy,
  insertSession as insertSessionRow,
  updateSession as updateSessionRow,
  deleteSession as deleteSessionRow,
} from '@/lib/supabase/sessions';
import { type Task, type Category, type Session, DEFAULT_CATEGORIES } from '@/types';
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
  sessions: Session[];
  sessionsHydrated: boolean; // core(tasks/categories) hydrate와 별개로 sessions 전체 조회 완료 여부
  refreshVersion: number;

  addTask: (input: { title: string; categoryId: string }) => Promise<string | null>;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'categoryId'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  /** 성공 여부를 반환 — 실패 시 호출부가 폼을 유지하고 재시도할 수 있도록 함 */
  addSession: (input: Omit<Session, 'id'>) => Promise<boolean>;
  updateSessionFields: (
    id: string,
    patch: Partial<Pick<Session, 'title' | 'note' | 'focusRating' | 'distractionTags' | 'taskId'>>,
  ) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;
  reorderTasks: (activeId: string, overId: string) => Promise<void>;
  addCategory: (input: { name: string; color: string }) => Promise<void>;
  updateCategory: (id: string, input: { name: string; color: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (activeId: string, overId: string) => Promise<void>;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface TaskStoreOptions {
  onSessionsChanged?: () => void;
}

export const createTaskStore = ({ onSessionsChanged }: TaskStoreOptions = {}) => {
  const pendingTaskIds: PendingIds = new Map();
  const pendingCategoryIds: PendingIds = new Map();
  const pendingSessionIds: PendingIds = new Map();
  const tracker = createMutationTracker();

  return createStore<TaskStore>()((set, get) => ({
    // SSR hydration mismatch 방지 — 실제 데이터는 hydrate()로 반영
    tasks: [],
    categories: DEFAULT_CATEGORIES,
    sessions: [],
    sessionsHydrated: false,
    refreshVersion: 0,

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

    addSession: tracker.track(async (input) => {
      const tempId = generateId();
      set((state) => ({ sessions: [{ id: tempId, ...input }, ...state.sessions] }));

      const idPromise = (async () => {
        const inserted = await insertSessionRow(input);
        if (!inserted) {
          set((state) => ({ sessions: state.sessions.filter((s) => s.id !== tempId) }));
          return null;
        }
        set((state) => ({ sessions: state.sessions.map((s) => (s.id === tempId ? inserted : s)) }));
        return inserted.id;
      })();
      trackPendingId(pendingSessionIds, tempId, idPromise);

      const insertedId = await idPromise;
      if (!insertedId) {
        toast(TOAST_MESSAGES.sessionSaveFailed);
        return false;
      }
      onSessionsChanged?.();
      return true;
    }),

    updateSessionFields: tracker.track(async (id, patch) => {
      const targetId = await resolvePendingId(pendingSessionIds, id);
      if (!targetId) return false;
      const original = get().sessions.find((s) => s.id === targetId);
      if (!original) return false;
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === targetId ? { ...s, ...patch } : s)),
      }));
      const { error } = await updateSessionRow(targetId, patch);
      if (error) {
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === targetId ? original : s)),
        }));
        toast(TOAST_MESSAGES.sessionSaveFailed);
        return false;
      }
      onSessionsChanged?.();
      return true;
    }),

    deleteSession: tracker.track(async (id) => {
      const targetId = await resolvePendingId(pendingSessionIds, id);
      if (!targetId) return false;
      const index = get().sessions.findIndex((s) => s.id === targetId);
      if (index === -1) return false;
      const target = get().sessions[index];
      set((state) => ({ sessions: state.sessions.filter((s) => s.id !== targetId) }));
      const { error } = await deleteSessionRow(targetId);
      if (error) {
        set((state) => {
          const sessions = [...state.sessions];
          sessions.splice(Math.min(index, sessions.length), 0, target);
          return { sessions };
        });
        toast(TOAST_MESSAGES.sessionDeleteFailed);
        return false;
      }
      onSessionsChanged?.();
      return true;
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

      // core와 별도로 진행 — 타이머/작업목록 등의 진입을 막지 않는다
      void fetchAllSessionsLazy().then((sessionsResult) => {
        set({ sessions: sessionsResult?.sessions ?? [], sessionsHydrated: true });
        if (sessionsResult?.invalidCount) {
          toast(TOAST_MESSAGES.sessionsInvalid(sessionsResult.invalidCount));
        }
      });
    },

    refresh: () =>
      tracker.refreshWhenIdle(
        () => Promise.all([fetchTasks(), fetchCategories(), fetchAllSessionsLazy()]),
        ([tasksResult, categoriesResult, sessionsResult]) => {
          set((state) => ({
            tasks: tasksResult?.tasks ?? state.tasks,
            categories: categoriesResult?.categories ?? state.categories,
            sessions: sessionsResult?.sessions ?? state.sessions,
            refreshVersion: state.refreshVersion + 1,
          }));
        },
      ),
  }));
};

export type TaskStoreApi = ReturnType<typeof createTaskStore>;
export type { TaskStore };
