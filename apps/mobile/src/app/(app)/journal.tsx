import { router } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { EmbeddedWebScreen } from '@/components/webview/EmbeddedWebScreen';

export default function JournalScreen() {
  const { session } = useAuth();
  if (!session)
    return (
      <NoticeScreen
        title="로그인하면 기록을 확인할 수 있어요"
        actionLabel="로그인"
        onAction={() => router.push('/login')}
      />
    );
  return <EmbeddedWebScreen path="/journal" />;
}
