'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { CATEGORY_CHART_MAX_ITEMS } from '@/lib/constants';
import { limitCategoryFocus } from '@/lib/dashboard';
import { formatDuration } from '@/lib/sessionUtils';
import { EmptyState } from '@/components/shared/EmptyState';
import { SrOnlyDataTable } from '@/components/dashboard/SrOnlyDataTable';
import type { CategoryFocusItem } from '@/types';

interface Props {
  data: CategoryFocusItem[];
}

export function CategoryChart({ data }: Props) {
  const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0);
  const chartData = limitCategoryFocus(data, CATEGORY_CHART_MAX_ITEMS);
  const hasData = data.length > 0;

  return (
    <div className="flex flex-col gap-3 p-5 rounded-lg border border-border bg-card min-h-[180px]">
      <p className="text-sm font-semibold text-foreground">카테고리별 집중</p>

      {hasData ? (
        <div className="flex items-center justify-center gap-4 flex-1">
          {/* Donut chart — 옆 범례가 이미 텍스트로 동일 정보를 제공하므로 접근성 트리에서 제외 */}
          <div
            aria-hidden="true"
            // 다크 모드는 그림자로 깊이를 표현하지 않는 원칙(design.md)이라 라이트 모드에만 적용
            className="relative shrink-0 w-[120px] h-[120px] dark:drop-shadow-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          >
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-foreground leading-tight text-center max-w-[60px] break-keep">
                {formatDuration(totalMinutes * 60)}
              </span>
              <span className="text-[10px] text-muted-foreground">총 집중</span>
            </div>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={120}
              initialDimension={{ width: 1, height: 1 }}
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="minutes"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="100%"
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? formatDuration(value * 60) : String(value),
                    String(name ?? ''),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend — 시각용, 스크린리더에는 아래 sr-only 테이블을 대신 제공 */}
          <div aria-hidden="true" className="flex flex-col gap-2 flex-1 min-w-0">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {/* 카테고리별 동적 hex 색상 — Tailwind 클래스로 표현 불가, 위 Cell fill과 동일한 예외 */}
                  <span
                    className="shrink-0 w-2 h-2 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-semibold text-foreground w-[68px] text-right tabular-nums">
                    {formatDuration(item.minutes * 60)}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-7 text-right tabular-nums">
                    {item.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <SrOnlyDataTable
            caption="카테고리별 집중 시간"
            rowHeaderLabel="카테고리"
            columns={['집중 시간', '비율']}
            rows={data.map((item) => ({
              label: item.name,
              values: [formatDuration(item.minutes * 60), `${item.percent}%`],
            }))}
          />
        </div>
      ) : (
        <EmptyState message="아직 기록이 없어요" className="flex-1" messageClassName="text-xs" />
      )}
    </div>
  );
}
