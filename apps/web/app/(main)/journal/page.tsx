import type { Metadata } from 'next';
import { JournalView } from '@/components/journal/JournalView';
import { GuestGate } from '@/components/shared/GuestGate';
import { getCurrentUser } from '@/lib/supabase/server';
import { NOTICE_MESSAGES } from '@/lib/constants/messages';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function JournalPage() {
  const loggedInPromise = getCurrentUser().then((user) => user !== null);

  return (
    <main id="main-content" className="flex-1 overflow-y-auto">
      <GuestGate loggedInPromise={loggedInPromise} title={NOTICE_MESSAGES.guestJournal}>
        <JournalView />
      </GuestGate>
    </main>
  );
}
