'use client';

import { useEffect } from 'react';
import { formatStartedAtLabel } from '@pomoroutine/shared';
import { useTimerStore, useHydrated } from '@/store/StoreProvider';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SESSION_LIMITS } from '@/lib/constants/limits';

export function AbandonedSessionDialog() {
  const hydrated = useHydrated();
  const sessionStarted = useTimerStore((s) => s.sessionStarted);
  const sessionEnded = useTimerStore((s) => s.sessionEnded);
  const startedAt = useTimerStore((s) => s.startedAt);
  const showAbandonedPrompt = useTimerStore((s) => s.showAbandonedPrompt);
  const sessionStartedAt = useTimerStore((s) => s.sessionStartedAt);
  const checkAbandoned = useTimerStore((s) => s.checkAbandoned);
  const dismissAbandonedPrompt = useTimerStore((s) => s.dismissAbandonedPrompt);
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const endSession = useTimerStore((s) => s.endSession);

  // 일시정지 상태로 방치되면 탭을 안 닫아도 주기적으로 재확인
  useEffect(() => {
    if (!hydrated || !sessionStarted || sessionEnded || startedAt !== null) return;

    checkAbandoned();
    const id = setInterval(checkAbandoned, SESSION_LIMITS.ABANDONED_CHECK_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAbandoned();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hydrated, sessionStarted, sessionEnded, startedAt, checkAbandoned]);

  if (!hydrated || !showAbandonedPrompt) return null;

  const startedLabel = sessionStartedAt ? formatStartedAtLabel(sessionStartedAt) : null;

  return (
    <ConfirmDialog
      open={showAbandonedPrompt}
      title="이전 타이머가 남아있어요"
      description={
        startedLabel
          ? `${startedLabel}에 시작한 타이머가 아직 끝나지 않았어요. 어떻게 할까요?`
          : '아직 끝나지 않은 타이머가 있어요. 어떻게 할까요?'
      }
      cancelLabel="이어가기"
      onCancel={dismissAbandonedPrompt}
      confirmLabel="종료하고 기록"
      onConfirm={() => {
        endSession();
        dismissAbandonedPrompt();
      }}
      tertiaryLabel="폐기"
      onTertiary={dismissSessionRecord}
    />
  );
}
