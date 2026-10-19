import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { TimerSettingsGroup } from '@/components/shared/TimerSettingsGroup';

export function TimerDefaultsSection() {
  const defaultTimerSettings = useSettings((s) => s.defaultTimerSettings);
  const { setTimerDefaults } = useSettingsActions();

  return (
    <TimerSettingsGroup
      focusMinutes={defaultTimerSettings.focusMinutes}
      onFocusMinutesChange={(v) =>
        void setTimerDefaults({ ...defaultTimerSettings, focusMinutes: v })
      }
      totalCycles={defaultTimerSettings.totalCycles}
      onTotalCyclesChange={(v) =>
        void setTimerDefaults({ ...defaultTimerSettings, totalCycles: v })
      }
      shortBreakMinutes={defaultTimerSettings.shortBreakMinutes}
      onShortBreakMinutesChange={(v) =>
        void setTimerDefaults({ ...defaultTimerSettings, shortBreakMinutes: v })
      }
    />
  );
}
