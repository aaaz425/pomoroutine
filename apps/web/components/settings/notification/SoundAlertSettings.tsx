'use client';

import { useState } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';
import { useSettingsStore } from '@/store/StoreProvider';
import { useSoundPreview } from '@/hooks/useSoundPreview';
import { StepperInput } from '@/components/shared/StepperInput';
import { Toggle } from '@/components/settings/notification/Toggle';
import { SoundTypeSelect } from '@/components/settings/notification/SoundTypeSelect';
import type { SoundType } from '@/types';
import { SOUND_LIMITS } from '@/lib/constants/limits';

export function SoundAlertSettings() {
  const soundAlert = useSettingsStore((s) => s.soundAlert);
  const soundType = useSettingsStore((s) => s.soundType);
  const soundVolume = useSettingsStore((s) => s.soundVolume);
  const soundRepeatCount = useSettingsStore((s) => s.soundRepeatCount);
  const setSoundAlert = useSettingsStore((s) => s.setSoundAlert);
  const setSoundType = useSettingsStore((s) => s.setSoundType);
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume);
  const setSoundRepeatCount = useSettingsStore((s) => s.setSoundRepeatCount);

  const [draftVolume, setDraftVolume] = useState<number | null>(null);
  const volume = draftVolume ?? soundVolume;

  const { isPlaying, toggle, stop } = useSoundPreview(soundType, volume, soundRepeatCount);

  function commitVolume() {
    if (draftVolume === null) return;
    if (draftVolume !== soundVolume) void setSoundVolume(draftVolume);
    setDraftVolume(null);
  }

  function handleSoundAlertToggle(enabled: boolean) {
    if (!enabled && isPlaying) stop();
    setSoundAlert(enabled);
  }

  function handleSoundTypeChange(type: SoundType) {
    if (isPlaying && type !== soundType) stop();
    setSoundType(type);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm text-foreground">소리 알림</p>
            <p className="text-xs text-muted-foreground mt-0.5">타이머 종료 시 소리 재생</p>
          </div>
        </div>
        <Toggle checked={soundAlert} onChange={handleSoundAlertToggle} />
      </div>

      <fieldset
        disabled={!soundAlert}
        className={`flex flex-col gap-4 m-0 p-4 border-0 rounded-xl bg-muted/40 transition-opacity min-w-0 ${
          soundAlert ? '' : 'opacity-40 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="sound-type" className="text-sm text-foreground shrink-0 w-16">
            소리 종류
          </label>
          <div className="flex items-center gap-1 shrink-0">
            <SoundTypeSelect value={soundType} onChange={handleSoundTypeChange} />
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? '미리듣기 정지' : '미리 듣기'}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-colors disabled:cursor-not-allowed shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" fill="currentColor" />
              ) : (
                <Play className="w-3.5 h-3.5" fill="currentColor" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="sound-volume" className="text-sm text-foreground shrink-0 w-16">
            음량
          </label>
          <div className="flex items-center gap-2 flex-1">
            <input
              id="sound-volume"
              type="range"
              min={SOUND_LIMITS.VOLUME_MIN}
              max={SOUND_LIMITS.VOLUME_MAX}
              step={5}
              value={volume}
              onChange={(e) => setDraftVolume(Number(e.target.value))}
              onPointerUp={commitVolume}
              onKeyUp={commitVolume}
              onBlur={commitVolume}
              className="flex-1 min-w-0 accent-primary disabled:cursor-not-allowed"
            />
            <span className="hidden sm:inline text-xs text-muted-foreground w-8 text-right shrink-0">
              {volume}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground shrink-0 w-16">반복 횟수</span>
          <StepperInput
            value={soundRepeatCount}
            onChange={setSoundRepeatCount}
            min={SOUND_LIMITS.REPEAT_MIN}
            max={SOUND_LIMITS.REPEAT_MAX}
            unit="회"
            label="반복 횟수"
          />
        </div>
      </fieldset>
    </div>
  );
}
