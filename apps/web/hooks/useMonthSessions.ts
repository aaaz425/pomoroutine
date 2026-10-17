'use client';

import { useCallback, useEffect, useState } from 'react';
import { addMonths, startOfMonth } from 'date-fns';
import { fetchSessionsInRange } from '@/lib/supabase/sessions';
import { useTaskStore } from '@/store/StoreProvider';
import type { Session } from '@/types';

export function useMonthSessions(viewedMonth: Date) {
  const refreshVersion = useTaskStore((s) => s.refreshVersion);
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [prevMonth, setPrevMonth] = useState(viewedMonth);
  if (viewedMonth.getTime() !== prevMonth.getTime()) {
    setPrevMonth(viewedMonth);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    const startIso = startOfMonth(viewedMonth).toISOString();
    const endIso = startOfMonth(addMonths(viewedMonth, 1)).toISOString();
    fetchSessionsInRange(startIso, endIso).then((result) => {
      if (cancelled) return;
      setItems(result?.sessions ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [viewedMonth, refreshVersion]);

  const updateItem = useCallback((id: string, patch: Partial<Session>) => {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { items, loading, updateItem, removeItem };
}
