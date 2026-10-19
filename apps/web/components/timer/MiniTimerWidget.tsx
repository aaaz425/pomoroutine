'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore, useHydrated } from '@/store/StoreProvider';
import { PHASE_BADGE_STYLES } from '@/lib/constants/timerColors';
import { formatClock } from '@pomoroutine/shared';

export function MiniTimerWidget() {
  const hydrated = useHydrated();
  const { displaySeconds, isRunning, phase, mode, cycleCount } = useTimer();
  const totalCycles = useTimerStore((s) => s.settings.totalCycles);
  const sessionStarted = useTimerStore((s) => s.sessionStarted);
  const pause = useTimerStore((s) => s.pause);
  const start = useTimerStore((s) => s.start);
  const pathname = usePathname();

  if (!hydrated || !sessionStarted || pathname === '/') return null;

  const phaseStyles = PHASE_BADGE_STYLES[phase];
  const dotClass = isRunning ? phaseStyles.dot : 'bg-muted-foreground/50';
  const iconClass = isRunning ? phaseStyles.text : 'text-muted-foreground';

  return (
    // 모바일: BottomNav 위 중앙 / 태블릿·데스크톱: 상단 중앙
    <div className="fixed bottom-18 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-4 z-40">
      <div className="flex items-center gap-2 rounded-full bg-card border border-border shadow-lg px-3 py-1.5 whitespace-nowrap">
        <Link href="/" className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatClock(displaySeconds)}
          </span>
          <span className="text-xs text-muted-foreground">
            {mode === 'free'
              ? '자유 집중'
              : `${phase === 'focus' ? '집중' : '휴식'} · ${cycleCount}/${totalCycles}`}
          </span>
        </Link>
        <button
          onClick={isRunning ? pause : start}
          aria-label={isRunning ? '타이머 일시정지' : '타이머 재생'}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
        >
          {isRunning ? (
            <Pause className={`w-3 h-3 ${iconClass}`} />
          ) : (
            <Play className={`w-3 h-3 ${iconClass}`} />
          )}
        </button>
      </div>
    </div>
  );
}
