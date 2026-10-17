import { Redirect, Stack, type ErrorBoundaryProps } from 'expo-router';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { useAuth } from '@/store/AuthProvider';
import { PortalProvider } from '@/components/shared/Portal';

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
      title="문제가 발생했습니다"
      message="화면을 불러오는 중 오류가 생겼어요"
      actionLabel="다시 시도"
      onAction={() => void retry()}
    />
  );
}
