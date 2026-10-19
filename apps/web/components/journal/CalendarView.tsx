'use client';

import { getMonthlyActivityData, getSessionsForDate } from '@pomoroutine/shared';
import { useState } from 'react';
import { CalendarMonthNav } from '@/components/journal/CalendarMonthNav';
import { CalendarMonthGrid } from '@/components/journal/CalendarMonthGrid';
import { CalendarDayModal } from '@/components/journal/CalendarDayModal';
import { useMonthSessions } from '@/hooks/useMonthSessions';
import { ErrorFallback } from '@/components/shared/ErrorFallback';
import type { Category, Session, Task } from '@/types';

interface Props {
  tasks: Task[];
  categories: Category[];
  selectedId: string | null;
  onSelect: (session: Session, sessionIndex: number) => void;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function CalendarView({ tasks, categories, selectedId, onSelect }: Props) {
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { items: monthSessions, isError, refetch } = useMonthSessions(viewedMonth);

  const monthData = getMonthlyActivityData(monthSessions, viewedMonth);

  const daySessions = selectedDate
    ? [...getSessionsForDate(monthSessions, selectedDate)].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      )
    : [];

  return (
    <div className="flex flex-col gap-4">
      <CalendarMonthNav
        month={viewedMonth}
        onPrevYear={() => setViewedMonth((m) => addMonths(m, -12))}
        onPrevMonth={() => setViewedMonth((m) => addMonths(m, -1))}
        onNextMonth={() => setViewedMonth((m) => addMonths(m, 1))}
        onNextYear={() => setViewedMonth((m) => addMonths(m, 12))}
        onToday={() => setViewedMonth(new Date())}
      />
      {isError && monthSessions.length === 0 ? (
        <ErrorFallback onRetry={refetch} />
      ) : (
        <CalendarMonthGrid
          data={monthData}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      <CalendarDayModal
        date={selectedDate}
        sessions={daySessions}
        tasks={tasks}
        categories={categories}
        selectedId={selectedId}
        onSelectSession={(session, sessionIndex) => {
          setSelectedDate(null);
          onSelect(session, sessionIndex);
        }}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}
