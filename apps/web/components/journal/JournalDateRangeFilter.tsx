'use client';

import { useState } from 'react';
import { DatePickerInput } from '@/components/shared/DatePickerInput';
import { useMarkedDates } from '@/hooks/useMarkedDates';
import { toLocalDateKey } from '@/lib/sessionUtils';

interface Props {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

type DatePreset = 'today' | 'week' | 'month';

const PRESETS: { label: string; preset: DatePreset }[] = [
  { label: '오늘', preset: 'today' },
  { label: '이번 주', preset: 'week' },
  { label: '이번 달', preset: 'month' },
];

function toKey(date: Date): string {
  return toLocalDateKey(date.toISOString());
}

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const todayKey = toKey(today);
  if (preset === 'today') return { from: todayKey, to: todayKey };
  if (preset === 'week') {
    const mon = new Date(today);
    mon.setDate(today.getDate() - (today.getDay() || 7) + 1);
    return { from: toKey(mon), to: todayKey };
  }
  return { from: `${todayKey.slice(0, 7)}-01`, to: todayKey };
}

export function JournalDateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: Props) {
  const today = toKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number } | null>(null);
  const markedDates = useMarkedDates(visibleMonth);

  function handleMonthChange(year: number, month: number) {
    setVisibleMonth({ year, month });
  }

  function isPresetActive(preset: DatePreset) {
    const { from, to } = getDateRange(preset);
    return dateFrom === from && dateTo === to;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        기간
      </span>
      <div className="flex gap-1.5">
        {PRESETS.map(({ label, preset }) => (
          <button
            key={preset}
            onClick={() => {
              const { from, to } = getDateRange(preset);
              onDateFromChange(from);
              onDateToChange(to);
            }}
            className={[
              'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              isPresetActive(preset)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <DatePickerInput
            value={dateFrom}
            onChange={onDateFromChange}
            max={dateTo && dateTo < today ? dateTo : today}
            placeholder="시작일"
            markedDates={markedDates}
            onMonthChange={handleMonthChange}
          />
        </div>
        <span className="text-muted-foreground text-sm shrink-0">-</span>
        <div className="flex-1">
          <DatePickerInput
            value={dateTo}
            onChange={onDateToChange}
            min={dateFrom || undefined}
            max={today}
            placeholder="종료일"
            markedDates={markedDates}
            onMonthChange={handleMonthChange}
          />
        </div>
      </div>
    </div>
  );
}
