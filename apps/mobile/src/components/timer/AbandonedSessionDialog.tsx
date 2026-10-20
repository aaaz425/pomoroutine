import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  ABANDONED_CHECK_INTERVAL_MS,
  formatStartedAtLabel,
  NOTICE_MESSAGES,
} from '@pomoroutine/shared';
import { useTimerStore } from '@/store/StoreProvider';
import { ConfirmModal } from '@/components/shared/ConfirmModal';

// document.visibilitychange 대신 AppState로 일시정지 상태 방치를 감지한다
export function AbandonedSessionDialog() {
  const sessionStarted = useTimerStore((s) => s.sessionStarted);
  const sessionEnded = useTimerStore((s) => s.sessionEnded);
  const startedAt = useTimerStore((s) => s.startedAt);
  const showAbandonedPrompt = useTimerStore((s) => s.showAbandonedPrompt);
  const sessionStartedAt = useTimerStore((s) => s.sessionStartedAt);
  const checkAbandoned = useTimerStore((s) => s.checkAbandoned);
  const dismissAbandonedPrompt = useTimerStore((s) => s.dismissAbandonedPrompt);
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const endSession = useTimerStore((s) => s.endSession);

  useEffect(() => {
    if (!sessionStarted || sessionEnded || startedAt !== null) return;

    checkAbandoned();
    const id = setInterval(checkAbandoned, ABANDONED_CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') checkAbandoned();
    });

    return () => {
      clearInterval(id);
      subscription.remove();
    };
  }, [sessionStarted, sessionEnded, startedAt, checkAbandoned]);

  if (!showAbandonedPrompt) return null;

  const startedLabel = sessionStartedAt ? formatStartedAtLabel(sessionStartedAt) : null;

  return (
    <ConfirmModal
      visible={showAbandonedPrompt}
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
