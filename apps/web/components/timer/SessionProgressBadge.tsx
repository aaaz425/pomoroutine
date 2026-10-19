'use client';

import { formatSessionProgressLabel } from '@pomoroutine/shared';
import { useTimerStore } from '@/store/StoreProvider';
import { CycleIndicator } from '@/components/timer/CycleIndicator';

// CycleIndicator는 free 모드에서 스스로 숨으므로 여기서 별도 분기하지 않는다
export function SessionProgressBadge() {
  const mode = useTimerStore((s) => s.mode);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const totalCycles = useTimerStore((s) => s.settings.totalCycles);
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <span className="text-[11px] text-muted-foreground">
        {formatSessionProgressLabel(mode, {
          cycleCount,
          totalCycles,
          focusSeconds: accFocusSeconds,
        })}
      </span>
      <CycleIndicator />
    </div>
  );
}
