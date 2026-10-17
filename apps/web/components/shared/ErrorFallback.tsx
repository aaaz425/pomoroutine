'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NOTICE_MESSAGES } from '@/lib/constants/messages';

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
        <h1 className="text-xl font-semibold text-foreground">{NOTICE_MESSAGES.errorTitle}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {NOTICE_MESSAGES.errorMessage}
          <br />
          {NOTICE_MESSAGES.errorRefreshHint}
        </p>
      </div>
      <Button
        onClick={onRetry}
        variant="default"
        size="lg"
        className="px-5 py-2.5 font-semibold hover:bg-primary/90"
      >
        {NOTICE_MESSAGES.retry}
      </Button>
    </div>
  );
}
