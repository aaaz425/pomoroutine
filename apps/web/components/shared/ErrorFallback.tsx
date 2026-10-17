'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onRetry: () => void;
  className?: string;
}

export function ErrorFallback({ onRetry, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center',
        className,
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">문제가 발생했습니다</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          페이지를 불러오는 중 오류가 생겼어요.
          <br />
          다시 시도하거나 새로고침해 주세요.
        </p>
      </div>
      <Button
        onClick={onRetry}
        variant="default"
        size="lg"
        className="px-5 py-2.5 font-semibold hover:bg-primary/90"
      >
        다시 시도
      </Button>
    </div>
  );
}
