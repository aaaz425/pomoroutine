'use client';

import { Download, CheckCircle2, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';

export function InstallSection() {
  const { status, triggerInstall } = useInstallPrompt();

  return (
    <>
      {status === 'installed' && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span>이미 앱으로 설치되어 있어요</span>
        </div>
      )}
      {status === 'installable' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            홈 화면에 추가하면 브라우저 없이 바로 실행할 수 있어요
          </p>
          <Button
            onClick={triggerInstall}
            variant="default"
            size="lg"
            className="gap-2 self-start px-4 font-semibold hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />앱 설치
          </Button>
        </div>
      )}
      {status === 'ios' && (
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Safari 하단 공유 버튼 →{' '}
            <span className="text-foreground font-medium">홈 화면에 추가</span>를 누르면 설치할 수
            있어요
          </p>
        </div>
      )}
    </>
  );
}
