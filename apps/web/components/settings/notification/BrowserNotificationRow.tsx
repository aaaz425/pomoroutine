'use client';

import { Bell } from 'lucide-react';
import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { Toggle } from '@/components/settings/notification/Toggle';

export function BrowserNotificationRow() {
  const browserNotification = useSettings((s) => s.browserNotification);
  const { setBrowserNotification } = useSettingsActions();

  async function handleChange(enabled: boolean) {
    if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    setBrowserNotification(enabled);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm text-foreground">브라우저 알림</p>
          <p className="text-xs text-muted-foreground mt-0.5">타이머 종료 시 알림 표시</p>
        </div>
      </div>
      <Toggle checked={browserNotification} onChange={handleChange} />
    </div>
  );
}
