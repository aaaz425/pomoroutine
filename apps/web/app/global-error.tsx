'use client';

import { ErrorFallback } from '@/components/shared/ErrorFallback';
import './globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="antialiased">
        <ErrorFallback onRetry={reset} className="min-h-dvh bg-background" />
      </body>
    </html>
  );
}
