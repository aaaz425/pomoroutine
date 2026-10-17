'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSessionsPage, type SessionsPageParams } from '@/lib/supabase/sessions';
import { SESSION_LIMITS } from '@/lib/constants/limits';
import { useTaskStore } from '@/store/StoreProvider';
import type { Session } from '@/types';

type SessionFilters = Pick<SessionsPageParams, 'categoryIds' | 'search' | 'dateFrom' | 'dateTo'>;

const SEARCH_DEBOUNCE_MS = 300;

// categoryIds는 호출부에서 useMemo로 참조를 고정해서 넘겨야 아래 effect가 매 렌더 재실행되지 않는다
export function useSessionsPage(filters: SessionFilters) {
  const refreshVersion = useTaskStore((s) => s.refreshVersion);
  const [items, setItems] = useState<Session[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search ?? '');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search ?? ''), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const resetKey = JSON.stringify([
    filters.categoryIds ?? [],
    debouncedSearch,
    filters.dateFrom ?? '',
    filters.dateTo ?? '',
  ]);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    fetchSessionsPage({
      cursor: null,
      limit: SESSION_LIMITS.JOURNAL_PAGE_SIZE,
      categoryIds: filters.categoryIds,
      search: debouncedSearch,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }).then((result) => {
      if (cancelled) return;
      setItems(result?.sessions ?? []);
      setCursor(result?.nextCursor ?? null);
      setHasMore(!!result?.nextCursor);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filters.categoryIds, debouncedSearch, filters.dateFrom, filters.dateTo, refreshVersion]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const result = await fetchSessionsPage({
      cursor,
      limit: SESSION_LIMITS.JOURNAL_PAGE_SIZE,
      categoryIds: filters.categoryIds,
      search: debouncedSearch,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    setItems((prev) => [...prev, ...(result?.sessions ?? [])]);
    setCursor(result?.nextCursor ?? null);
    setHasMore(!!result?.nextCursor);
    setLoading(false);
  }, [
    cursor,
    hasMore,
    loading,
    filters.categoryIds,
    debouncedSearch,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const updateItem = useCallback((id: string, patch: Partial<Session>) => {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { items, hasMore, loading, loadMore, updateItem, removeItem };
}
