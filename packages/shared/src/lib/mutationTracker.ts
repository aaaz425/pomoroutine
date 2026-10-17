export function createMutationTracker() {
  const inFlight = new Set<Promise<unknown>>();
  let startedCount = 0;
  let refreshing: Promise<void> | null = null;

  function track<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
    return (...args: A): Promise<R> => {
      startedCount++;
      const promise = fn(...args);
      inFlight.add(promise);
      void promise.then(
        () => inFlight.delete(promise),
        () => inFlight.delete(promise),
      );
      return promise;
    };
  }

  async function runRefresh<T>(fetcher: () => Promise<T>, apply: (result: T) => void) {
    while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
    const before = startedCount;
    const result = await fetcher();
    if (startedCount === before) apply(result);
  }

  function refreshWhenIdle<T>(
    fetcher: () => Promise<T>,
    apply: (result: T) => void,
  ): Promise<void> {
    if (!refreshing) {
      refreshing = runRefresh(fetcher, apply).finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  return { track, refreshWhenIdle };
}

export type MutationTracker = ReturnType<typeof createMutationTracker>;
