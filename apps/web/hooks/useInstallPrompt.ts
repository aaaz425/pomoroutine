'use client';

import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallStatus = 'installed' | 'installable' | 'ios' | 'unavailable';

let promptEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  installed = window.matchMedia('(display-mode: standalone)').matches;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptEvent = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    promptEvent = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getStatus(): InstallStatus {
  if (installed) return 'installed';
  if (promptEvent) return 'installable';
  if (isIos()) return 'ios';
  return 'unavailable';
}

async function triggerInstall() {
  if (!promptEvent) return;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  if (outcome === 'accepted') installed = true;
  promptEvent = null;
  emit();
}

export function useInstallPrompt() {
  const status = useSyncExternalStore(subscribe, getStatus, () => 'unavailable' as const);
  return { status, triggerInstall };
}
