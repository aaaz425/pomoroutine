'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { JournalSessionList } from '@/components/journal/JournalSessionList';
import { JournalFilterModal } from '@/components/journal/JournalFilterModal';
import { PageSpinner } from '@/components/shared/PageSpinner';
import { useJournalFilters } from '@/hooks/useJournalFilters';
import { useSessionsPage } from '@/hooks/useSessionsPage';
import { useTaskStore } from '@/store/StoreProvider';
import { formatCount, groupSessionsByDate } from '@/lib/sessionUtils';
import type { Category, Session, Task } from '@/types';

export interface SessionSyncHandle {
  updateItem: (id: string, patch: Partial<Session>) => void;
  removeItem: (id: string) => void;
}

interface Props {
  tasks: Task[];
  categories: Category[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
}

export const ListView = forwardRef<SessionSyncHandle, Props>(function ListView(
  { tasks, categories, selectedId, onSelect },
  ref,
) {
  const [filterOpen, setFilterOpen] = useState(false);
  const allSessions = useTaskStore((s) => s.sessions);
  const markedDates = new Set(allSessions.map((s) => s.startedAt.slice(0, 10)));

  const {
    searchQuery,
    setSearchQuery,
    selectedCategoryIds,
    setSelectedCategoryIds,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    hasActiveFilter,
    reset: resetFilters,
  } = useJournalFilters();

  const categoryIds = useMemo(() => Array.from(selectedCategoryIds), [selectedCategoryIds]);
  const { items, hasMore, loading, loadMore, updateItem, removeItem } = useSessionsPage({
    categoryIds,
    search: searchQuery,
    dateFrom,
    dateTo,
  });

  useImperativeHandle(ref, () => ({ updateItem, removeItem }), [updateItem, removeItem]);

  const groups = groupSessionsByDate(items);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const filterButton = (
    <button
      onClick={() => setFilterOpen(true)}
      aria-label="검색 · 필터"
      className={[
        'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors',
        hasActiveFilter
          ? 'border-primary text-primary bg-primary/10'
          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
      ].join(' ')}
    >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      <span>검색</span>
      {hasActiveFilter && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{formatCount(items.length)}개의 기록</span>
        {filterButton}
      </div>
      {loading && items.length === 0 ? (
        <PageSpinner />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">검색 결과가 없어요</p>
          <button onClick={resetFilters} className="text-sm text-primary hover:underline">
            필터 초기화
          </button>
        </div>
      ) : (
        <>
          <JournalSessionList
            groups={groups}
            tasks={tasks}
            categories={categories}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loading && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
            )}
          </div>
        </>
      )}

      <JournalFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        searchQuery={searchQuery}
        selectedCategoryIds={selectedCategoryIds}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategoryIds}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={resetFilters}
        markedDates={markedDates}
      />
    </div>
  );
});
