import { Redirect, Stack, type ErrorBoundaryProps } from 'expo-router';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { useAuth } from '@/store/AuthProvider';
import { PortalProvider } from '@/components/shared/Portal';
import { NOTICE_MESSAGES } from '@pomoroutine/shared';

export default function AuthGroupLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (session) return <Redirect href="/" />;

  return (
    <PortalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PortalProvider>
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
