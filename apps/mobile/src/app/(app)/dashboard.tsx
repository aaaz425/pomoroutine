import { router } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { EmbeddedWebScreen } from '@/components/webview/EmbeddedWebScreen';
import { NOTICE_MESSAGES } from '@pomoroutine/shared';

export default function DashboardScreen() {
  const { session } = useAuth();
  if (!session)
    return (
      <NoticeScreen
        title={NOTICE_MESSAGES.guestDashboard}
        actionLabel={NOTICE_MESSAGES.login}
        onAction={() => router.push('/login')}
      />
    );
  return <EmbeddedWebScreen path="/dashboard" />;
}
