import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { SoundType } from '@pomoroutine/shared';
import { toast } from '@/lib/toast';
import { TOAST_MESSAGES } from '@pomoroutine/shared';

// 웹 apps/web/lib/notifications.ts의 SOUND_SEQUENCE_INTERVAL과 동일
const SOUND_SEQUENCE_INTERVAL_MS = 1900;
// 각 사운드 asset 자체 길이(초) — assets/sounds/gen-sounds.js 참고
const TONE_DURATION_MS = 1500;

const SOUND_ASSETS: Record<SoundType, number> = {
  sine: require('../../assets/sounds/sine.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  digital: require('../../assets/sounds/digital.wav'),
};

let audioModeReady: Promise<void> | null = null;
function ensureAudioMode(): Promise<void> {
  if (!audioModeReady) {
    // 무음 스위치가 켜져 있어도 재생되게 하고, 다른 앱 오디오를 끊지 않는다
    audioModeReady = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
  }
  return audioModeReady;
}

let activeGeneration = 0;
let scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];
let activePlayers: AudioPlayer[] = [];

function clearScheduled() {
  scheduledTimeouts.forEach(clearTimeout);
  scheduledTimeouts = [];
  activePlayers.forEach((p) => {
    try {
      p.remove();
    } catch {}
  });
  activePlayers = [];
}

export async function playAlarm({
  type,
  volume,
  repeatCount,
  onEnded,
}: {
  type: SoundType;
  volume: number;
  repeatCount: number;
  onEnded?: () => void;
}): Promise<void> {
  try {
    await ensureAudioMode();

    const myGeneration = ++activeGeneration;
    clearScheduled();

    const playOnce = () => {
      if (myGeneration !== activeGeneration) return;
      const player = createAudioPlayer(SOUND_ASSETS[type]);
      player.volume = Math.max(0, Math.min(100, volume)) / 100;
      activePlayers.push(player);
      player.play();

      // 자연 재생 종료 후에도 activePlayers에 남아 누적되는 걸 막기 위해 재생 길이만큼 뒤에 정리
      const cleanup = setTimeout(() => {
        activePlayers = activePlayers.filter((p) => p !== player);
        try {
          player.remove();
        } catch {}
      }, TONE_DURATION_MS);
      scheduledTimeouts.push(cleanup);
    };

    for (let i = 0; i < repeatCount; i++) {
      const timeout = setTimeout(playOnce, i * SOUND_SEQUENCE_INTERVAL_MS);
      scheduledTimeouts.push(timeout);
    }

    const totalDuration = (repeatCount - 1) * SOUND_SEQUENCE_INTERVAL_MS + TONE_DURATION_MS;
    const endTimeout = setTimeout(() => {
      if (myGeneration === activeGeneration) onEnded?.();
    }, totalDuration);
    scheduledTimeouts.push(endTimeout);
  } catch {
    toast(TOAST_MESSAGES.soundPlayFailed);
    onEnded?.();
  }
}

export function stopAlarm(): void {
  activeGeneration++;
  clearScheduled();
}
