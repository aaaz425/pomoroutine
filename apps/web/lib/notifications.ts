import type { SoundType } from '@/types';
import { SOUND_SEQUENCE_INTERVAL_MS } from '@/lib/constants/ux';

export function sendNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/icon-192.png' });
}

let sharedCtx: AudioContext | null = null;
let activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let activeGeneration = 0;

function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
}

// 페이드 종료 — 하드 컷은 클릭/팝 노이즈 유발
function stopActiveSequence(ctx: AudioContext, atTime: number): void {
  for (const { osc, gain } of activeNodes) {
    try {
      const current = gain.gain.value;
      gain.gain.cancelScheduledValues(atTime);
      gain.gain.setValueAtTime(current, atTime);
      gain.gain.linearRampToValueAtTime(0.0001, atTime + 0.03);
      osc.stop(atTime + 0.03);
    } catch {}
  }
  activeNodes = [];
}

function playTone(
  ctx: AudioContext,
  {
    type,
    freq,
    startTime,
    duration,
    peakGain,
    rampTo = 0.001,
  }: {
    type: OscillatorType;
    freq: number;
    startTime: number;
    duration: number;
    peakGain: number;
    rampTo?: number;
  },
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(peakGain, startTime);
  gain.gain.exponentialRampToValueAtTime(rampTo, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
  activeNodes.push({ osc, gain });
  return osc;
}

function playSine(ctx: AudioContext, peakGain: number, startTime: number): OscillatorNode {
  return playTone(ctx, { type: 'sine', freq: 880, startTime, duration: 1.5, peakGain });
}

// C6→E6 2음
function playChime(ctx: AudioContext, peakGain: number, startTime: number): OscillatorNode {
  playTone(ctx, { type: 'triangle', freq: 1046.5, startTime, duration: 0.9, peakGain });
  return playTone(ctx, {
    type: 'triangle',
    freq: 1318.5,
    startTime: startTime + 0.25,
    duration: 1.25,
    peakGain: peakGain * 0.9,
  });
}

// 비정수배 배음(2.4×, 3.8×)으로 종소리 특유의 불협화음 질감을 냄
function playBell(ctx: AudioContext, peakGain: number, startTime: number): OscillatorNode {
  const last = playTone(ctx, { type: 'sine', freq: 660, startTime, duration: 1.5, peakGain });
  playTone(ctx, {
    type: 'sine',
    freq: 660 * 2.4,
    startTime,
    duration: 1.0,
    peakGain: peakGain * 0.5,
  });
  playTone(ctx, {
    type: 'sine',
    freq: 660 * 3.8,
    startTime,
    duration: 0.6,
    peakGain: peakGain * 0.3,
  });
  return last;
}

function playDigital(ctx: AudioContext, peakGain: number, startTime: number): OscillatorNode {
  let last: OscillatorNode;
  for (let i = 0; i < 4; i++) {
    last = playTone(ctx, {
      type: 'square',
      freq: 1760,
      startTime: startTime + i * 0.45,
      duration: 0.15,
      peakGain: peakGain * 0.8,
      rampTo: 0.15,
    });
  }
  return last!;
}

const SOUND_PLAYERS: Record<
  SoundType,
  (ctx: AudioContext, peakGain: number, startTime: number) => OscillatorNode
> = {
  sine: playSine,
  chime: playChime,
  bell: playBell,
  digital: playDigital,
};

export function playAlarm({
  type,
  volume,
  repeatCount,
  onEnded,
}: {
  type: SoundType;
  volume: number;
  repeatCount: number;
  onEnded?: () => void;
}): void {
  try {
    const myGeneration = ++activeGeneration;
    const ctx = getAudioContext();
    stopActiveSequence(ctx, ctx.currentTime);

    const peakGain = (Math.max(0, Math.min(100, volume)) / 100) * 0.5;
    const play = SOUND_PLAYERS[type];
    let lastOsc: OscillatorNode | null = null;
    for (let i = 0; i < repeatCount; i++) {
      lastOsc = play(ctx, peakGain, ctx.currentTime + (i * SOUND_SEQUENCE_INTERVAL_MS) / 1000);
    }
    if (lastOsc) {
      lastOsc.onended = () => {
        if (myGeneration === activeGeneration) onEnded?.();
      };
    }
  } catch {}
}

export function stopAlarm(): void {
  if (!sharedCtx) return;
  try {
    stopActiveSequence(sharedCtx, sharedCtx.currentTime);
  } catch {}
}
