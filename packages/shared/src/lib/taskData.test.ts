import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTaskQueries, getTaskActions, type TaskDataApi } from './taskData';
import { QUERY_KEYS } from '../constants/queryKeys';
import { TOAST_MESSAGES } from '../constants/toastMessages';
import type { Task, Category } from '../types/task';

const task = (id: string, categoryId = 'c1'): Task => ({
  id,
  title: `작업 ${id}`,
  categoryId,
  createdAt: '2024-01-01T00:00:00.000Z',
});
const category = (id: string): Category => ({ id, name: `카테고리 ${id}`, color: '#3b82f6' });

function createApi(): TaskDataApi {
  return {
    fetchTasks: vi.fn().mockResolvedValue({ tasks: [], invalidCount: 0 }),
    fetchCategories: vi.fn().mockResolvedValue({ categories: [], invalidCount: 0 }),
    insertTask: vi.fn(),
    updateTask: vi.fn().mockResolvedValue({ error: false }),
    deleteTask: vi.fn().mockResolvedValue({ error: false }),
    reorderTasks: vi.fn().mockResolvedValue({ error: false }),
    insertCategory: vi.fn(),
    updateCategory: vi.fn().mockResolvedValue({ error: false }),
    deleteCategory: vi.fn().mockResolvedValue({ error: false, blocked: false }),
    reorderCategories: vi.fn().mockResolvedValue({ error: false }),
    toast: vi.fn(),
  };
}

let api: TaskDataApi;
let client: QueryClient;

function setup(tasks: Task[], categories: Category[] = []) {
  client.setQueryData(QUERY_KEYS.tasks, tasks);
  client.setQueryData(QUERY_KEYS.categories, categories);
  vi.mocked(api.fetchTasks).mockResolvedValue({ tasks, invalidCount: 0 });
  vi.mocked(api.fetchCategories).mockResolvedValue({ categories, invalidCount: 0 });
  return getTaskActions(client, api);
}

const cachedTasks = () => client.getQueryData<Task[]>(QUERY_KEYS.tasks);
const cachedCategories = () => client.getQueryData<Category[]>(QUERY_KEYS.categories);

beforeEach(() => {
  api = createApi();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('createTaskQueries', () => {
  it('조회 실패(null)면 에러로 처리', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue(null);
    await expect(client.fetchQuery(createTaskQueries(api).tasks)).rejects.toThrow();
  });

  it('형식이 안 맞는 항목은 첫 조회에서만 알림', async () => {
    vi.mocked(api.fetchTasks).mockResolvedValue({ tasks: [task('t1')], invalidCount: 2 });
    const query = createTaskQueries(api).tasks;

    await client.fetchQuery(query);
    await client.fetchQuery({ ...query, staleTime: 0 });

    expect(api.toast).toHaveBeenCalledTimes(1);
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.sessionsInvalid(2));
  });
});

describe('작업', () => {
  it('addTask — 저장된 작업을 맨 앞에 넣고 순서를 저장한 뒤 id 반환', async () => {
    const actions = setup([task('t1')]);
    vi.mocked(api.insertTask).mockResolvedValue(task('t2'));

    const id = await actions.addTask({ title: '  새 작업  ', categoryId: 'c1' });

    expect(id).toBe('t2');
    expect(api.insertTask).toHaveBeenCalledWith({ title: '새 작업', categoryId: 'c1' });
    expect(api.reorderTasks).toHaveBeenCalledWith(['t2', 't1']);
    expect(cachedTasks()?.map((t) => t.id)).toEqual(['t2', 't1']);
  });

  it('addTask — 저장 실패면 목록을 그대로 두고 null 반환', async () => {
    const actions = setup([task('t1')]);
    vi.mocked(api.insertTask).mockResolvedValue(null);

    const id = await actions.addTask({ title: '새 작업', categoryId: 'c1' });

    expect(id).toBeNull();
    expect(cachedTasks()?.map((t) => t.id)).toEqual(['t1']);
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.taskAddFailed);
  });

  it('updateTask — 저장 전에 화면에 먼저 반영', async () => {
    const actions = setup([task('t1')]);
    let resolve: (value: { error: boolean }) => void = () => {};
    vi.mocked(api.updateTask).mockReturnValue(new Promise((r) => (resolve = r)));

    const pending = actions.updateTask('t1', { title: '  바뀐 제목 ' });
    await vi.waitFor(() => expect(cachedTasks()?.[0].title).toBe('바뀐 제목'));
    resolve({ error: false });
    await pending;

    expect(api.updateTask).toHaveBeenCalledWith('t1', { title: '바뀐 제목' });
  });

  it('updateTask — 저장 실패면 이전 값으로 되돌림', async () => {
    const actions = setup([task('t1')]);
    vi.mocked(api.updateTask).mockResolvedValue({ error: true });

    await actions.updateTask('t1', { title: '바뀐 제목' });

    expect(cachedTasks()?.[0].title).toBe('작업 t1');
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.taskSaveFailed);
  });

  it('deleteTask — 저장 실패면 삭제한 작업을 되돌림', async () => {
    const actions = setup([task('t1'), task('t2')]);
    vi.mocked(api.deleteTask).mockResolvedValue({ error: true });

    await actions.deleteTask('t1');

    expect(cachedTasks()?.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.taskDeleteFailed);
  });

  it('reorderTasks — from 위치의 작업을 to 위치로 옮기고 새 순서를 저장', async () => {
    const actions = setup([task('t1'), task('t2'), task('t3')]);

    await actions.reorderTasks(0, 2);

    expect(api.reorderTasks).toHaveBeenCalledWith(['t2', 't3', 't1']);
  });

  it('reorderTasks — 범위를 벗어난 위치면 아무것도 하지 않음', async () => {
    const actions = setup([task('t1')]);

    await actions.reorderTasks(-1, 0);

    expect(api.reorderTasks).not.toHaveBeenCalled();
  });

  it('진행 중인 변경이 모두 끝난 뒤에만 다시 조회', async () => {
    const actions = setup([task('t1'), task('t2')]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    await Promise.all([
      actions.updateTask('t1', { title: 'A' }),
      actions.updateTask('t2', { title: 'B' }),
    ]);

    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe('카테고리', () => {
  it('addCategory — 저장된 카테고리를 끝에 추가하고 현재 개수를 position으로 저장', async () => {
    const actions = setup([], [category('c1')]);
    vi.mocked(api.insertCategory).mockResolvedValue(category('c2'));

    await actions.addCategory({ name: ' 새 카테고리 ', color: '#22c55e' });

    expect(api.insertCategory).toHaveBeenCalledWith({
      name: '새 카테고리',
      color: '#22c55e',
      position: 1,
    });
    expect(cachedCategories()?.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('addCategory — 상한 개수에 도달하면 저장하지 않음', async () => {
    const actions = setup(
      [],
      Array.from({ length: 10 }, (_, i) => category(`c${i}`)),
    );

    await actions.addCategory({ name: '초과', color: '#22c55e' });

    expect(api.insertCategory).not.toHaveBeenCalled();
  });

  it('deleteCategory — 사용 중인 카테고리는 지우지 않고 알림', async () => {
    const actions = setup([task('t1', 'c1')], [category('c1')]);

    await actions.deleteCategory('c1');

    expect(api.deleteCategory).not.toHaveBeenCalled();
    expect(cachedCategories()?.map((c) => c.id)).toEqual(['c1']);
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.categoryInUse);
  });

  it('deleteCategory — DB가 참조 때문에 막으면 되돌리고 사용 중 알림', async () => {
    const actions = setup([], [category('c1')]);
    vi.mocked(api.deleteCategory).mockResolvedValue({ error: true, blocked: true });

    await actions.deleteCategory('c1');

    expect(cachedCategories()?.map((c) => c.id)).toEqual(['c1']);
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.categoryInUse);
  });

  it('updateCategory — 이름을 trim해서 저장', async () => {
    const actions = setup([], [category('c1')]);

    await actions.updateCategory('c1', { name: ' 운동 ', color: '#f97316' });

    expect(api.updateCategory).toHaveBeenCalledWith('c1', { name: '운동', color: '#f97316' });
  });
});
