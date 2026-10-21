'use client';

import { useInstallPrompt } from '@/hooks/useInstallPrompt';

// beforeinstallprompt는 페이지 로드 직후 한 번만 와서 설정 화면에 들어가기 전에 받아 둔다
export function InstallPromptListener() {
  useInstallPrompt();
  return null;
}
