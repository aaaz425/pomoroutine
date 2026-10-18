import { describe, it, expect, beforeEach, vi } from 'vitest';

import { createTaskStore } from '@/store/taskStore';
import { DEFAULT_CATEGORIES } from '@/types';
import type { Category, Task } from '@/types';
import { fetchTasks, insertTask, updateTask, deleteTask, reorderTasks } from '@/lib/supabase/tasks';
import {
  fetchCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/supabase/categories';

vi.mock('@/lib/supabase/tasks', () => ({
  fetchTasks: vi.fn(),
  insertTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  reorderTasks: vi.fn(),
}));
vi.mock('@/lib/supabase/categories', () => ({
  fetchCategories: vi.fn(),
  insertCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
}));

const mockFetchTasks = vi.mocked(fetchTasks);
const mockInsertTask = vi.mocked(insertTask);
const mockUpdateTask = vi.mocked(updateTask);
const mockDeleteTask = vi.mocked(deleteTask);
const mockReorderTasks = vi.mocked(reorderTasks);

const mockFetchCategories = vi.mocked(fetchCategories);
const mockInsertCategory = vi.mocked(insertCategory);
const mockUpdateCategory = vi.mocked(updateCategory);
const mockDeleteCategory = vi.mocked(deleteCategory);
const mockReorderCategories = vi.mocked(reorderCategories);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `db-id-${idCounter}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  // insert 계열은 "입력값 + 새 DB id"를 돌려주는 실제 supabase insert().select().single()의 echo-back을 흉내
  mockInsertTask.mockImplementation(async (input) => ({
    id: nextId(),
    title: input.title,
    categoryId: input.categoryId,
    createdAt: new Date().toISOString(),
  }));
  mockInsertCategory.mockImplementation(async (input) => ({
    id: nextId(),
    name: input.name,
    color: input.color,
  }));
  mockUpdateTask.mockResolvedValue({ error: false });
  mockDeleteTask.mockResolvedValue({ error: false });
  mockReorderTasks.mockResolvedValue({ error: false });
  mockUpdateCategory.mockResolvedValue({ error: false });
  mockDeleteCategory.mockResolvedValue({ error: false, blocked: false });
  mockReorderCategories.mockResolvedValue({ error: false });
});

async function addNCategories(store: ReturnType<typeof createTaskStore>, n: number) {
  for (let i = 0; i < n; i++) {
    await store.getState().addCategory({ name: `cat-${i}`, color: 'bg-blue-500' });
  }
}

describe('addTask', () => {
  it('title 양 끝 공백이 trim됨', async () => {
    const store = createTaskStore();
    await store.getState().addTask({ title: '  공부하기  ', categoryId: 'c1' });
    expect(store.getState().tasks[0].title).toBe('공부하기');
    expect(mockInsertTask).toHaveBeenCalledWith(expect.objectContaining({ title: '공부하기' }));
  });

  it('새 task는 목록 맨 앞에 추가됨', async () => {
    const store = createTaskStore();
    await store.getState().addTask({ title: 'first', categoryId: 'c1' });
    await store.getState().addTask({ title: 'second', categoryId: 'c1' });
    expect(store.getState().tasks.map((t) => t.title)).toEqual(['second', 'first']);
  });

  it('생성된 task의 실제 DB id를 반환함', async () => {
    const store = createTaskStore();
    const id = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    expect(id).not.toBeNull();
    expect(store.getState().tasks[0].id).toBe(id);
  });

  it('insertTask가 실패(null)하면 낙관적으로 추가했던 task가 롤백되고 null을 반환함', async () => {
    mockInsertTask.mockResolvedValueOnce(null);
    const store = createTaskStore();
    const id = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    expect(id).toBeNull();
    expect(store.getState().tasks).toHaveLength(0);
  });
});

describe('updateTask', () => {
  it('title/categoryId를 부분적으로 변경할 수 있음', async () => {
    const store = createTaskStore();
    const id = await store.getState().addTask({ title: 'A', categoryId: 'c1' });

    await store.getState().updateTask(id!, { title: 'B' });

    const task = store.getState().tasks[0];
    expect(task.title).toBe('B');
    expect(task.categoryId).toBe('c1'); // 패치에 없는 필드는 유지
  });

  it('title 양 끝 공백이 trim됨', async () => {
    const store = createTaskStore();
    const id = await store.getState().addTask({ title: 'A', categoryId: 'c1' });

    await store.getState().updateTask(id!, { title: '  B  ' });

    expect(store.getState().tasks[0].title).toBe('B');
  });

  it('존재하지 않는 id면 아무 task도 변경되지 않고 저장 호출도 없음', async () => {
    const store = createTaskStore();
    await store.getState().addTask({ title: 'A', categoryId: 'c1' });

    await store.getState().updateTask('no-such-id', { title: 'B' });

    expect(store.getState().tasks[0].title).toBe('A');
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('updateTask가 실패하면 이전 값으로 롤백됨', async () => {
    const store = createTaskStore();
    const id = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    mockUpdateTask.mockResolvedValueOnce({ error: true });

    await store.getState().updateTask(id!, { title: 'B' });

    expect(store.getState().tasks[0].title).toBe('A');
  });

  it('addTask 저장 대기 중 같은 task를 수정하면, insert 완료 후에도 수정 내용이 유지되고 실제 DB id로 저장됨', async () => {
    const store = createTaskStore();
    let resolveInsert!: (value: Task) => void;
    mockInsertTask.mockImplementationOnce(
      () => new Promise((resolve) => (resolveInsert = resolve)),
    );

    const addPromise = store.getState().addTask({ title: 'A', categoryId: 'c1' });
    const tempId = store.getState().tasks[0].id;

    const updatePromise = store.getState().updateTask(tempId, { title: 'B' });

    resolveInsert({
      id: 'db-id-1',
      title: 'A',
      categoryId: 'c1',
      createdAt: new Date().toISOString(),
    });
    await addPromise;
    await updatePromise;

    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().tasks[0]).toMatchObject({ id: 'db-id-1', title: 'B' });
    expect(mockUpdateTask).toHaveBeenCalledWith('db-id-1', expect.objectContaining({ title: 'B' }));
  });
});

describe('deleteTask', () => {
  it('해당 id의 task가 목록에서 제거됨', async () => {
    const store = createTaskStore();
    const id = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    await store.getState().deleteTask(id!);
    expect(store.getState().tasks).toHaveLength(0);
  });

  it('존재하지 않는 id면 목록이 그대로 유지되고 삭제 호출도 없음', async () => {
    const store = createTaskStore();
    await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    await store.getState().deleteTask('no-such-id');
    expect(store.getState().tasks).toHaveLength(1);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('addTask 저장 대기 중 같은 task를 삭제하면, insert 완료 후에도 삭제된 상태가 유지됨', async () => {
    const store = createTaskStore();
    let resolveInsert!: (value: Task) => void;
    mockInsertTask.mockImplementationOnce(
      () => new Promise((resolve) => (resolveInsert = resolve)),
    );

    const addPromise = store.getState().addTask({ title: 'A', categoryId: 'c1' });
    const tempId = store.getState().tasks[0].id;

    const deletePromise = store.getState().deleteTask(tempId);

    resolveInsert({
      id: 'db-id-1',
      title: 'A',
      categoryId: 'c1',
      createdAt: new Date().toISOString(),
    });
    await addPromise;
    await deletePromise;

    expect(store.getState().tasks).toHaveLength(0);
    expect(mockDeleteTask).toHaveBeenCalledWith('db-id-1');
  });
});

describe('reorderTasks', () => {
  it('activeId를 overId 위치로 이동시킴', async () => {
    const store = createTaskStore();
    const idA = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    const idB = await store.getState().addTask({ title: 'B', categoryId: 'c1' });
    const idC = await store.getState().addTask({ title: 'C', categoryId: 'c1' });
    await store.getState().reorderTasks(idA!, idC!);
    expect(store.getState().tasks.map((t) => t.id)).toEqual([idA, idC, idB]);
  });

  it('activeId가 존재하지 않으면 아무 변경도 없고 저장 호출도 없음', async () => {
    const store = createTaskStore();
    const idA = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    const idB = await store.getState().addTask({ title: 'B', categoryId: 'c1' });
    mockReorderTasks.mockClear();
    await store.getState().reorderTasks('no-such-id', idA!);
    expect(store.getState().tasks.map((t) => t.id)).toEqual([idB, idA]);
    expect(mockReorderTasks).not.toHaveBeenCalled();
  });

  it('overId가 존재하지 않으면 아무 변경도 없음', async () => {
    const store = createTaskStore();
    const idA = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    const idB = await store.getState().addTask({ title: 'B', categoryId: 'c1' });
    await store.getState().reorderTasks(idA!, 'no-such-id');
    expect(store.getState().tasks.map((t) => t.id)).toEqual([idB, idA]);
  });

  it('reorderTasksRows가 재정렬된 새 순서의 id 배열로 호출됨', async () => {
    const store = createTaskStore();
    const idA = await store.getState().addTask({ title: 'A', categoryId: 'c1' });
    const idB = await store.getState().addTask({ title: 'B', categoryId: 'c1' });
    mockReorderTasks.mockClear();
    await store.getState().reorderTasks(idA!, idB!);
    expect(mockReorderTasks).toHaveBeenCalledWith([idA, idB]);
  });
});

describe('addCategory', () => {
  it('새 category가 목록 끝에 추가됨', async () => {
    const store = createTaskStore();
    await store.getState().addCategory({ name: '새 카테고리', color: 'bg-pink-500' });
    const categories = store.getState().categories;
    expect(categories[categories.length - 1].name).toBe('새 카테고리');
  });

  it('name 양 끝 공백이 trim됨', async () => {
    const store = createTaskStore();
    await store.getState().addCategory({ name: '  여행  ', color: 'bg-pink-500' });
    const categories = store.getState().categories;
    expect(categories[categories.length - 1].name).toBe('여행');
  });

  it('카테고리가 정확히 10개면 추가 시 아무 동작도 하지 않음 (상한)', async () => {
    const store = createTaskStore();
    await addNCategories(store, 5);
    expect(store.getState().categories).toHaveLength(10);
    await store.getState().addCategory({ name: '11번째', color: 'bg-pink-500' });
    expect(store.getState().categories).toHaveLength(10);
    expect(mockInsertCategory).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: '11번째' }),
    );
  });

  it('카테고리가 9개일 때는 정상적으로 10개까지 추가 가능', async () => {
    const store = createTaskStore();
    await addNCategories(store, 4);
    expect(store.getState().categories).toHaveLength(9);
    await store.getState().addCategory({ name: '10번째', color: 'bg-pink-500' });
    expect(store.getState().categories).toHaveLength(10);
  });

  it('insertCategory가 실패(null)하면 낙관적으로 추가했던 category가 롤백됨', async () => {
    mockInsertCategory.mockResolvedValueOnce(null);
    const store = createTaskStore();
    await store.getState().addCategory({ name: '새 카테고리', color: 'bg-pink-500' });
    expect(store.getState().categories).toEqual(DEFAULT_CATEGORIES);
  });
});

describe('updateCategory / deleteCategory', () => {
  it('updateCategory — 해당 id의 name/color가 변경됨', async () => {
    const store = createTaskStore();
    const id = DEFAULT_CATEGORIES[0].id;
    await store.getState().updateCategory(id, { name: '바뀐 이름', color: 'bg-red-500' });
    const category = store.getState().categories.find((c) => c.id === id);
    expect(category).toMatchObject({ name: '바뀐 이름', color: 'bg-red-500' });
  });

  it('updateCategory — name이 trim됨', async () => {
    const store = createTaskStore();
    const id = DEFAULT_CATEGORIES[0].id;
    await store.getState().updateCategory(id, { name: '  공백  ', color: 'bg-red-500' });
    const category = store.getState().categories.find((c) => c.id === id);
    expect(category?.name).toBe('공백');
  });

  it('deleteCategory — 해당 id의 category가 목록에서 제거됨', async () => {
    const store = createTaskStore();
    const id = DEFAULT_CATEGORIES[0].id;
    await store.getState().deleteCategory(id);
    expect(store.getState().categories.find((c) => c.id === id)).toBeUndefined();
  });

  it('deleteCategory — DB에서 FK violation으로 막히면(로컬엔 참조 작업 정보가 없던 경우) 롤백됨', async () => {
    mockDeleteCategory.mockResolvedValueOnce({ error: true, blocked: true });
    const store = createTaskStore();
    const id = DEFAULT_CATEGORIES[0].id;
    await store.getState().deleteCategory(id);
    expect(store.getState().categories.find((c) => c.id === id)).toBeDefined();
  });

  it('deleteCategory — 로컬에 참조하는 작업이 있으면 낙관적 삭제 없이 즉시 막힘(깜빡임 방지)', async () => {
    const store = createTaskStore();
    const categoryId = DEFAULT_CATEGORIES[0].id;
    await store.getState().addTask({ title: 'A', categoryId });
    mockDeleteCategory.mockClear();

    await store.getState().deleteCategory(categoryId);

    expect(store.getState().categories.find((c) => c.id === categoryId)).toBeDefined();
    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });

  it('addCategory 저장 대기 중 같은 category를 수정하면, insert 완료 후에도 수정 내용이 유지되고 실제 DB id로 저장됨', async () => {
    const store = createTaskStore();
    let resolveInsert!: (value: Category) => void;
    mockInsertCategory.mockImplementationOnce(
      () => new Promise((resolve) => (resolveInsert = resolve)),
    );

    const addPromise = store.getState().addCategory({ name: '원래 이름', color: 'bg-pink-500' });
    const categories = store.getState().categories;
    const tempId = categories[categories.length - 1].id;

    // 이 수정이 나중 도착한 insert reconcile에 덮어써져 사라지던 회귀 케이스
    const updatePromise = store
      .getState()
      .updateCategory(tempId, { name: '수정된 이름', color: 'bg-red-500' });

    resolveInsert({ id: 'db-id-1', name: '원래 이름', color: 'bg-pink-500' });
    await addPromise;
    await updatePromise;

    const category = store.getState().categories.find((c) => c.id === 'db-id-1');
    expect(category).toMatchObject({ name: '수정된 이름', color: 'bg-red-500' });
    expect(mockUpdateCategory).toHaveBeenCalledWith(
      'db-id-1',
      expect.objectContaining({ name: '수정된 이름' }),
    );
  });

  it('addCategory 저장이 끝난 뒤 tempId로 수정해도 실제 DB id로 저장됨', async () => {
    const store = createTaskStore();
    mockInsertCategory.mockResolvedValueOnce({
      id: 'db-id-2',
      name: '원래 이름',
      color: 'bg-pink-500',
    });

    const addPromise = store.getState().addCategory({ name: '원래 이름', color: 'bg-pink-500' });
    const categories = store.getState().categories;
    const tempId = categories[categories.length - 1].id;
    await addPromise;

    await store.getState().updateCategory(tempId, { name: '수정된 이름', color: 'bg-red-500' });

    const category = store.getState().categories.find((c) => c.id === 'db-id-2');
    expect(category).toMatchObject({ name: '수정된 이름', color: 'bg-red-500' });
    expect(mockUpdateCategory).toHaveBeenCalledWith(
      'db-id-2',
      expect.objectContaining({ name: '수정된 이름' }),
    );
  });

  it('addCategory 저장 대기 중 같은 category를 삭제하면, insert 완료 후에도 삭제된 상태가 유지됨', async () => {
    const store = createTaskStore();
    let resolveInsert!: (value: Category) => void;
    mockInsertCategory.mockImplementationOnce(
      () => new Promise((resolve) => (resolveInsert = resolve)),
    );

    const addPromise = store.getState().addCategory({ name: '원래 이름', color: 'bg-pink-500' });
    const categories = store.getState().categories;
    const tempId = categories[categories.length - 1].id;

    const deletePromise = store.getState().deleteCategory(tempId);

    resolveInsert({ id: 'db-id-1', name: '원래 이름', color: 'bg-pink-500' });
    await addPromise;
    await deletePromise;

    expect(store.getState().categories.find((c) => c.id === 'db-id-1')).toBeUndefined();
    expect(mockDeleteCategory).toHaveBeenCalledWith('db-id-1');
  });
});

describe('reorderCategories', () => {
  it('activeId를 overId 위치로 이동시킴', async () => {
    const store = createTaskStore();
    const [c0, c1] = DEFAULT_CATEGORIES;
    await store.getState().reorderCategories(c0.id, c1.id);
    expect(store.getState().categories[0].id).toBe(c1.id);
    expect(store.getState().categories[1].id).toBe(c0.id);
  });

  it('activeId 또는 overId가 존재하지 않으면 아무 변경도 없음', async () => {
    const store = createTaskStore();
    const before = store.getState().categories.map((c) => c.id);
    await store.getState().reorderCategories('no-such-id', DEFAULT_CATEGORIES[0].id);
    expect(store.getState().categories.map((c) => c.id)).toEqual(before);
  });
});

describe('hydrate', () => {
  it('fetchTasks/fetchCategories 결과로 상태가 복원됨', async () => {
    const task: Task = {
      id: 't1',
      title: '저장된 작업',
      categoryId: 'c1',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    mockFetchTasks.mockResolvedValueOnce({ tasks: [task], invalidCount: 0 });
    mockFetchCategories.mockResolvedValueOnce({ categories: DEFAULT_CATEGORIES, invalidCount: 0 });

    const store = createTaskStore();
    await store.getState().hydrate();
    expect(store.getState().tasks).toEqual([task]);
    expect(store.getState().categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('형식이 안 맞는 항목이 있으면 조용히 빼고 나머지만 복원됨', async () => {
    mockFetchTasks.mockResolvedValueOnce({ tasks: [], invalidCount: 2 });
    mockFetchCategories.mockResolvedValueOnce({ categories: DEFAULT_CATEGORIES, invalidCount: 0 });

    const store = createTaskStore();
    await expect(store.getState().hydrate()).resolves.not.toThrow();
    expect(store.getState().tasks).toEqual([]);
  });

  it('조회가 전부 실패(null)하면 tasks는 빈 배열, categories는 DEFAULT_CATEGORIES로 복원됨', async () => {
    mockFetchTasks.mockResolvedValueOnce(null);
    mockFetchCategories.mockResolvedValueOnce(null);

    const store = createTaskStore();
    await store.getState().hydrate();
    expect(store.getState().tasks).toEqual([]);
    expect(store.getState().categories).toEqual(DEFAULT_CATEGORIES);
  });
});

describe('refresh', () => {
  const task: Task = {
    id: 't1',
    title: '다른 기기에서 추가',
    categoryId: 'c1',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('다시 조회한 데이터로 바꿈', async () => {
    mockFetchTasks.mockResolvedValueOnce({ tasks: [task], invalidCount: 0 });
    mockFetchCategories.mockResolvedValueOnce({ categories: DEFAULT_CATEGORIES, invalidCount: 0 });

    const store = createTaskStore();
    await store.getState().refresh();

    expect(store.getState().tasks).toEqual([task]);
  });

  it('조회에 실패한 항목은 기존 데이터를 유지', async () => {
    mockFetchTasks.mockResolvedValueOnce(null);
    mockFetchCategories.mockResolvedValueOnce(null);

    const store = createTaskStore();
    store.setState({ tasks: [task] });
    await store.getState().refresh();

    expect(store.getState().tasks).toEqual([task]);
  });

  it('추가 요청이 끝난 뒤에 조회해 낙관적으로 추가한 항목을 덮어쓰지 않음', async () => {
    let resolveInsert!: (value: Task) => void;
    mockInsertTask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInsert = resolve;
        }),
    );
    const inserted: Task = { ...task, id: 'db-new', title: '새 작업' };
    mockFetchTasks.mockResolvedValueOnce({ tasks: [inserted], invalidCount: 0 });
    mockFetchCategories.mockResolvedValueOnce({ categories: DEFAULT_CATEGORIES, invalidCount: 0 });

    const store = createTaskStore();
    const adding = store.getState().addTask({ title: '새 작업', categoryId: 'c1' });
    const refreshing = store.getState().refresh();
    expect(mockFetchTasks).not.toHaveBeenCalled();

    resolveInsert(inserted);
    await adding;
    await refreshing;

    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
    expect(store.getState().tasks).toEqual([inserted]);
  });
});
