import { router } from 'expo-router';
import { useAuth } from '@/store/AuthProvider';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { EmbeddedWebScreen } from '@/components/webview/EmbeddedWebScreen';
import { NOTICE_MESSAGES } from '@pomoroutine/shared';

export default function JournalScreen() {
  const { session } = useAuth();
  if (!session)
    return (
      <NoticeScreen
        title={NOTICE_MESSAGES.guestJournal}
        actionLabel={NOTICE_MESSAGES.login}
        onAction={() => router.push('/login')}
      />
    );
  return <EmbeddedWebScreen path="/journal" />;
}
