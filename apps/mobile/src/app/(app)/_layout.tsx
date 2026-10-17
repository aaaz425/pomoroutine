import AppTabs from '@/components/app-tabs';
import { StoreProvider } from '@/store/StoreProvider';
import { PortalProvider, Portal } from '@/components/shared/Portal';
import { Toaster } from '@/components/shared/Toast';
import { MiniTimerWidget } from '@/components/timer/MiniTimerWidget';
import { TimerEngine } from '@/components/timer/TimerEngine';
import type { ErrorBoundaryProps } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { NOTICE_MESSAGES } from '@pomoroutine/shared';

export default function AppGroupLayout() {
  const { loading } = useAuth();

  if (loading) return null;

  return (
    <StoreProvider>
      <PortalProvider>
        <AppTabs />
        <Portal>
          <MiniTimerWidget />
        </Portal>
        <TimerEngine />
        <Toaster />
      </PortalProvider>
    </StoreProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <NoticeScreen
      title={NOTICE_MESSAGES.errorTitle}
      message={NOTICE_MESSAGES.errorMessage}
      actionLabel={NOTICE_MESSAGES.retry}
      onAction={() => void retry()}
    />
  );
}
