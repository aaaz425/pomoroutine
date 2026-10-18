'use client';

import { useState } from 'react';
import { ListView } from '@/components/journal/ListView';
import { CalendarView } from '@/components/journal/CalendarView';
import { InsightsSection } from '@/components/journal/InsightsSection';
import { JournalTabs } from '@/components/journal/JournalTabs';
import { SessionDetailOverlay } from '@/components/journal/SessionDetailOverlay';
import { JournalEmptyState } from '@/components/journal/JournalEmptyState';
import { JournalSkeleton } from '@/components/journal/JournalSkeleton';
import { ErrorFallback } from '@/components/shared/ErrorFallback';
import { useHydrated, useTaskStore } from '@/store/StoreProvider';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';
import { useJournalData } from '@/hooks/useJournalData';
import type { JournalTab, Session } from '@/types';

interface Selection {
  session: Session;
  sessionIndex: number;
}

export function JournalView() {
  const hydrated = useHydrated();
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const { summary, insightSessions, isError, refetch } = useJournalData();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [activeTab, setActiveTab] = useState<JournalTab>('list');

  const showSkeleton = useDelayedFlag(!hydrated || !summary || !insightSessions);

  if (hydrated && isError && (!summary || !insightSessions)) {
    return <ErrorFallback onRetry={refetch} />;
  }
  if (!hydrated || !summary || !insightSessions) {
    return showSkeleton ? <JournalSkeleton /> : null;
  }
  if (summary.count === 0) return <JournalEmptyState />;

  const selectedSession = selection?.session ?? null;
  const selectedTask = selectedSession
    ? (tasks.find((t) => t.id === selectedSession.taskId) ?? null)
    : null;
  const selectedCategory = selectedTask
    ? (categories.find((c) => c.id === selectedTask.categoryId) ?? null)
    : null;

  function handleSelect(session: Session, sessionIndex: number) {
    setSelection({ session, sessionIndex });
  }

  function handleUpdated(patch: Partial<Session>) {
    setSelection((current) =>
      current ? { ...current, session: { ...current.session, ...patch } } : current,
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">기록</h1>
        </div>
        <JournalTabs value={activeTab} onChange={setActiveTab} />
      </header>

      <InsightsSection
        sessions={insightSessions}
        categoryRatings={summary.categoryRatings}
        categories={categories}
      />

      {activeTab === 'list' && (
        <ListView
          tasks={tasks}
          categories={categories}
          selectedId={selectedSession?.id ?? null}
          onSelect={handleSelect}
        />
      )}
      {activeTab === 'calendar' && (
        <CalendarView
          tasks={tasks}
          categories={categories}
          selectedId={selectedSession?.id ?? null}
          onSelect={handleSelect}
        />
      )}

      <SessionDetailOverlay
        session={selectedSession}
        sessionIndex={selection?.sessionIndex ?? 0}
        task={selectedTask}
        category={selectedCategory}
        onClose={() => setSelection(null)}
        onUpdated={handleUpdated}
        onDeleted={() => setSelection(null)}
      />
    </div>
  );
}
