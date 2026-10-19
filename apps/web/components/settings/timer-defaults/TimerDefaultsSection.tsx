'use client';

import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { TimerSettingsGroup } from '@/components/shared/TimerSettingsGroup';

export function TimerDefaultsSection() {
  const defaultTimerSettings = useSettings((s) => s.defaultTimerSettings);
  const { setTimerDefaults } = useSettingsActions();

  return (
    <TimerSettingsGroup
      focusMinutes={defaultTimerSettings.focusMinutes}
      onFocusMinutesChange={(v) => setTimerDefaults({ ...defaultTimerSettings, focusMinutes: v })}
      totalCycles={defaultTimerSettings.totalCycles}
      onTotalCyclesChange={(v) => setTimerDefaults({ ...defaultTimerSettings, totalCycles: v })}
      shortBreakMinutes={defaultTimerSettings.shortBreakMinutes}
      onShortBreakMinutesChange={(v) =>
        setTimerDefaults({ ...defaultTimerSettings, shortBreakMinutes: v })
      }
    />
  );
}
