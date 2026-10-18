'use client';

import { Badge } from '@/components/shared/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SrOnlyDataTable } from '@/components/dashboard/SrOnlyDataTable';

interface Props {
  hourly: number[];
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '자정';
  if (hour === 12) return '정오';
  if (hour < 12) return `오전 ${hour}시`;
  return `오후 ${hour - 12}시`;
}

const X_LABEL_HOURS = [0, 6, 12, 18, 23];

export function HourlyChart({ hourly }: Props) {
  const max = Math.max(...hourly, 1);

  const peakHour = hourly.indexOf(Math.max(...hourly));
  const hasFocus = hourly.some((v) => v > 0);

  return (
    <div className="flex flex-col gap-3 p-5 rounded-lg border border-border bg-card min-h-[180px]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">시간대별 집중 분석</p>
        {hasFocus && (
          <Badge className="bg-primary/15 text-primary font-medium">
            최다 {formatHourLabel(peakHour)}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        {hasFocus && (
          <SrOnlyDataTable
            caption="시간대별 집중 분석"
            rowHeaderLabel="시간대"
            columns={['집중 시간']}
            rows={hourly.map((sec, hour) => ({
              label: formatHourLabel(hour),
              values: [`${Math.round(sec / 60)}분`],
            }))}
          />
        )}
        {/* Bars */}
        <div aria-hidden="true" className="flex items-end gap-0.5 flex-1">
          {hourly.map((val, i) => {
            const ratio = val / max;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary"
                style={{
                  height: val > 0 ? `${Math.max(ratio * 100, 10)}%` : '3px',
                  opacity: val > 0 ? Math.max(0.18, 0.18 + ratio * 0.82) : 0.12,
                }}
              />
            );
          })}
        </div>

        {/* X Labels */}
        <div className="relative h-3">
          {X_LABEL_HOURS.map((hour) => (
            <span
              key={hour}
              className={`absolute text-[10px] text-muted-foreground ${
                hour === 0 || hour === 23 ? '' : '-translate-x-1/2'
              }`}
              style={{
                left: hour === 23 ? undefined : `${(hour / 23) * 100}%`,
                right: hour === 23 ? 0 : undefined,
              }}
            >
              {hour === 0
                ? '자정'
                : hour === 6
                  ? '오전 6시'
                  : hour === 12
                    ? '정오'
                    : hour === 18
                      ? '오후 6시'
                      : '자정'}
            </span>
          ))}
        </div>
      </div>

      {!hasFocus && (
        <EmptyState message="아직 기록이 없어요" className="pb-1" messageClassName="text-xs" />
      )}
    </div>
  );
}
