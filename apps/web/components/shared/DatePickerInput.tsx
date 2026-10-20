'use client';

import { useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  subMonths,
  getDaysInMonth,
  startOfMonth,
  getDay,
  isToday,
  format,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useClickOutside } from '@/hooks/useClickOutside';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  markedDates?: Set<string>; // 기록 있는 날짜 (YYYY-MM-DD)
  onMonthChange?: (year: number, month: number) => void; // 백엔드 연동 시 월별 fetch용
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function parseKey(key: string): Date | null {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function DatePickerInput({
  value,
  onChange,
  min,
  max,
  placeholder = '날짜 선택',
  markedDates,
  onMonthChange,
}: Props) {
  const parsed = parseKey(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(parsed ?? new Date());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(triggerRef, dropdownRef, () => setOpen(false), open);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDow = getDay(startOfMonth(viewDate)); // 0 = Sun

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null); // 항상 6행으로 고정

  function dayKey(day: number) {
    return format(new Date(year, month, day), 'yyyy-MM-dd');
  }

  function isDisabled(day: number) {
    const k = dayKey(day);
    if (min && k < min) return true;
    if (max && k > max) return true;
    return false;
  }

  function handleSelect(day: number) {
    if (isDisabled(day)) return;
    onChange(dayKey(day));
    setOpen(false);
  }

  const maxDate = max ? parseKey(max) : null;
  const isAtMaxMonth =
    maxDate !== null &&
    viewDate.getFullYear() === maxDate.getFullYear() &&
    viewDate.getMonth() === maxDate.getMonth();

  const displayText = parsed ? format(parsed, 'yyyy. M. d', { locale: ko }) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) {
            const d = parseKey(value) ?? viewDate;
            setViewDate(d);
            onMonthChange?.(d.getFullYear(), d.getMonth() + 1);
          }
          setOpen((p) => !p);
        }}
        className={[
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/50 border text-sm transition-colors',
          open ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30',
          displayText ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        <CalendarIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">{displayText ?? placeholder}</span>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 bg-card border border-border rounded-xl shadow-2xl p-3 select-none"
        >
          {/* month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                const next = subMonths(viewDate, 1);
                setViewDate(next);
                onMonthChange?.(next.getFullYear(), next.getMonth() + 1);
              }}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {format(viewDate, 'yyyy년 M월', { locale: ko })}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = addMonths(viewDate, 1);
                setViewDate(next);
                onMonthChange?.(next.getFullYear(), next.getMonth() + 1);
              }}
              disabled={isAtMaxMonth}
              className={[
                'p-1 rounded-md transition-colors',
                isAtMaxMonth
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-medium text-muted-foreground py-0.5"
              >
                {d}
              </div>
            ))}
          </div>

          {/* day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="aspect-square" />;
              const disabled = isDisabled(day);
              const selected = value === dayKey(day);
              const today = isToday(new Date(year, month, day));
              const marked = markedDates?.has(dayKey(day)) ?? false;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(day)}
                  className={[
                    'relative w-full aspect-square text-xs rounded-md flex items-center justify-center transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : today
                        ? 'border border-primary/40 text-foreground hover:bg-muted/50'
                        : disabled
                          ? 'text-muted-foreground/30 cursor-not-allowed'
                          : 'text-foreground hover:bg-muted/60',
                  ].join(' ')}
                >
                  {day}
                  {marked && (
                    <span
                      className={[
                        'absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                        selected ? 'bg-primary-foreground/70' : 'bg-primary',
                      ].join(' ')}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* clear */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground py-1 hover:bg-muted/40 rounded-md transition-colors text-center"
            >
              선택 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
