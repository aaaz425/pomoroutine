import AppTabs from '@/components/app-tabs';
import { StoreProvider } from '@/store/StoreProvider';
import { PortalProvider, Portal } from '@/components/shared/Portal';
import { Toaster } from '@/components/shared/Toast';
import { MiniTimerWidget } from '@/components/timer/MiniTimerWidget';
import { TimerEngine } from '@/components/timer/TimerEngine';
import type { ErrorBoundaryProps } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';
import { NoticeScreen } from '@/components/shared/NoticeScreen';

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
      title="문제가 발생했습니다"
      message="화면을 불러오는 중 오류가 생겼어요"
      actionLabel="다시 시도"
      onAction={() => void retry()}
    />
  );
}
