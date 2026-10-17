import { describe, expect, it, vi } from 'vitest';
import { createMutationTracker } from './mutationTracker';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('createMutationTracker', () => {
  it('진행 중인 변경이 없으면 조회 결과를 반영', async () => {
    const tracker = createMutationTracker();
    const apply = vi.fn();
    await tracker.refreshWhenIdle(async () => 'fresh', apply);
    expect(apply).toHaveBeenCalledWith('fresh');
  });

  it('진행 중인 변경이 끝난 뒤에 조회', async () => {
    const tracker = createMutationTracker();
    const mutation = deferred<void>();
    const fetcher = vi.fn(async () => 'fresh');
    void tracker.track(() => mutation.promise)();

    const refresh = tracker.refreshWhenIdle(fetcher, vi.fn());
    await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();

    mutation.resolve();
    await refresh;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('실패한 변경도 끝난 것으로 보고 조회', async () => {
    const tracker = createMutationTracker();
    const apply = vi.fn();
    await tracker
      .track(async () => Promise.reject(new Error('x')))()
      .catch(() => {});
    await tracker.refreshWhenIdle(async () => 'fresh', apply);
    expect(apply).toHaveBeenCalledWith('fresh');
  });

  it('조회 중 새 변경이 시작되면 결과를 버림', async () => {
    const tracker = createMutationTracker();
    const response = deferred<string>();
    const apply = vi.fn();

    const refresh = tracker.refreshWhenIdle(() => response.promise, apply);
    await Promise.resolve();
    await tracker.track(async () => {})();
    response.resolve('stale');
    await refresh;

    expect(apply).not.toHaveBeenCalled();
  });

  it('조회가 진행 중이면 새 요청은 같은 조회를 공유', async () => {
    const tracker = createMutationTracker();
    const response = deferred<string>();
    const fetcher = vi.fn(() => response.promise);

    const first = tracker.refreshWhenIdle(fetcher, vi.fn());
    const second = tracker.refreshWhenIdle(fetcher, vi.fn());
    response.resolve('fresh');
    await Promise.all([first, second]);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
