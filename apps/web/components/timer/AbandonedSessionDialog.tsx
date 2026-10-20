'use client';

import { useEffect } from 'react';
import { formatStartedAtLabel, NOTICE_MESSAGES } from '@pomoroutine/shared';
import { useTimerStore, useHydrated } from '@/store/StoreProvider';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ABANDONED_CHECK_INTERVAL_MS } from '@/lib/constants/ux';

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
    const id = setInterval(checkAbandoned, ABANDONED_CHECK_INTERVAL_MS);
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
      title={NOTICE_MESSAGES.abandonedTitle}
      description={NOTICE_MESSAGES.abandonedMessage(startedLabel)}
      cancelLabel={NOTICE_MESSAGES.abandonedContinue}
      onCancel={dismissAbandonedPrompt}
      confirmLabel={NOTICE_MESSAGES.abandonedEnd}
      onConfirm={() => {
        endSession();
        dismissAbandonedPrompt();
      }}
      tertiaryLabel={NOTICE_MESSAGES.abandonedDiscard}
      onTertiary={dismissSessionRecord}
    />
  );
}
