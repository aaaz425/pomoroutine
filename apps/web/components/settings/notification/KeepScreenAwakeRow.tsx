'use client';

import { Eye } from 'lucide-react';
import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { Toggle } from '@/components/settings/notification/Toggle';

export function KeepScreenAwakeRow() {
  const keepScreenAwake = useSettings((s) => s.keepScreenAwake);
  const { setKeepScreenAwake } = useSettingsActions();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm text-foreground">화면 꺼짐 방지</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            타이머 실행 중 화면이 꺼지지 않아요
          </p>
        </div>
      </div>
      <Toggle checked={keepScreenAwake} onChange={setKeepScreenAwake} />
    </div>
  );
}
