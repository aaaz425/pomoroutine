'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Square, Play, Pause } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useTimerStore } from '@/store/StoreProvider';
import { useCurrentTask } from '@/hooks/useCurrentTask';
import { useRotatingMessage } from '@/hooks/useRotatingMessage';
import { useSessionEndFlow } from '@/hooks/useSessionEndFlow';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { TimerRing } from '@/components/timer/TimerRing';
import { CycleIndicator } from '@/components/timer/CycleIndicator';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { MESSAGE_ROTATE_INTERVAL_MS } from '@/lib/constants/ux';
import { withReducedMotion } from '@/lib/motion';

export function FocusMode() {
  const reducedMotion = !!useReducedMotion();
  const isFocusMode = useTimerStore((s) => s.isFocusMode);
  const isRunning = useTimerStore((s) => s.startedAt !== null);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const exitFocusMode = useTimerStore((s) => s.exitFocusMode);
  const { task, category } = useCurrentTask();

  const messages = useSettings((s) => s.motivationalMessages);
  const message = useRotatingMessage(messages, MESSAGE_ROTATE_INTERVAL_MS, isFocusMode);
  const { showEndConfirm, requestEnd, confirmEnd, cancelEnd } = useSessionEndFlow({
    pauseOnRequest: false,
  });

  useEffect(() => {
    if (!isFocusMode) return;

    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (showEndConfirm) {
        if (e.key === 'Escape') cancelEnd();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) pause();
        else start();
      } else if (e.key === 'Escape') {
        exitFocusMode();
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isFocusMode, isRunning, pause, start, exitFocusMode, showEndConfirm, cancelEnd]);

  return (
    <AnimatePresence>
      {isFocusMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={withReducedMotion(reducedMotion, { duration: 0.25, ease: 'easeOut' })}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-4"
        >
          {/* Exit Button */}
          <button
            onClick={exitFocusMode}
            aria-label="집중 모드 나가기"
            className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] right-6 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            나가기
          </button>

          {/* Task Section */}
          <div className="relative flex flex-col items-center gap-2">
            {task ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-foreground">{task.title}</span>
                {category && <CategoryBadge category={category} />}
              </div>
            ) : (
              <span className="text-xl font-semibold text-muted-foreground/50">작업 없음</span>
            )}
          </div>

          {/* 동기부여 메시지 */}
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={withReducedMotion(reducedMotion, { duration: 0.3, ease: 'easeOut' })}
              className="text-sm text-muted-foreground/80 text-center max-w-xs"
            >
              {message}
            </motion.p>
          </AnimatePresence>

          {/* 타이머 링 */}
          <div className="relative">
            <TimerRing />
          </div>

          {/* 사이클 */}
          <div className="relative">
            <CycleIndicator />
          </div>

          {/* 컨트롤 */}
          <div className="relative flex items-center gap-3">
            <Button
              onClick={isRunning ? pause : start}
              size="lg"
              className="gap-1.5 px-5 py-2.5 font-semibold"
            >
              {isRunning ? (
                <Pause className="w-3.5 h-3.5" fill="currentColor" />
              ) : (
                <Play className="w-3.5 h-3.5" fill="currentColor" />
              )}
              {isRunning ? '정지' : '시작'}
            </Button>
            <Button
              onClick={requestEnd}
              variant="outline"
              size="lg"
              className="gap-1.5 px-4 py-2.5 text-muted-foreground"
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
              종료
            </Button>
          </div>

          {/* 키보드 힌트 — 데스크탑 전용 */}
          <p className="absolute bottom-6 text-xs text-muted-foreground/30 hidden sm:block">
            Space · 정지 | Esc · 나가기
          </p>

          <ConfirmDialog
            open={showEndConfirm}
            title="타이머를 종료할까요?"
            onConfirm={confirmEnd}
            onCancel={cancelEnd}
            closeOnBackdropClick
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
