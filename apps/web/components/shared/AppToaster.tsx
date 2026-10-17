'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

export function AppToaster() {
  const { isDark } = useTheme();

  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'bg-popover! text-popover-foreground! border! shadow-lg! text-left!',
          success: 'border-success! shadow-success/25! [&_[data-icon]]:text-success',
          info: 'border-info! shadow-info/25! [&_[data-icon]]:text-info',
          error: 'border-destructive! shadow-destructive/25! [&_[data-icon]]:text-destructive',
        },
      }}
    />
  );
}
