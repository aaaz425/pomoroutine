'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EmptyState } from '@/components/shared/EmptyState';
import { SrOnlyDataTable } from '@/components/dashboard/SrOnlyDataTable';
import type { FocusTrendMeta } from '@/types';

interface Props {
  trend: FocusTrendMeta;
  focusLabel: string;
}

export function FocusChart({ trend, focusLabel }: Props) {
  const { data, categories: usedCats } = trend;

  const hasData = usedCats.length > 0;

  return (
    <div className="flex flex-col gap-3 p-5 rounded-lg border border-border bg-card min-h-[200px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{focusLabel}</p>
        {hasData && (
          <div aria-hidden="true" className="flex flex-wrap gap-3">
            {usedCats.map((cat) => (
              <span
                key={cat.name}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      {hasData ? (
        <div className="flex-1 min-h-[140px]">
          <SrOnlyDataTable
            caption={focusLabel}
            rowHeaderLabel="구간"
            columns={usedCats.map((cat) => cat.name)}
            rows={data.map((item) => ({
              label: item.label,
              values: usedCats.map((cat) => `${item[cat.name] ?? 0}분`),
            }))}
          />
          <div aria-hidden="true" className="w-full h-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={140}
              initialDimension={{ width: 1, height: 1 }}
            >
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
                barCategoryGap="30%"
                barSize={22}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v === 0 ? '' : `${v}분`)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? `${value}분` : String(value),
                    String(name ?? ''),
                  ]}
                />
                {usedCats.map((cat) => (
                  <Bar key={cat.name} dataKey={cat.name} stackId="a" fill={cat.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState message="아직 기록이 없어요" className="flex-1" messageClassName="text-xs" />
      )}
    </div>
  );
}
