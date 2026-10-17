'use client';

import { ErrorFallback } from '@/components/shared/ErrorFallback';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback onRetry={reset} className="min-h-dvh bg-background" />;
}
