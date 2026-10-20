'use client';

import type { ReactNode } from 'react';
import { GuestPrompt } from '@/components/shared/GuestPrompt';
import { useResolved } from '@/hooks/useResolved';

interface Props {
  loggedInPromise: Promise<boolean>;
  title: string;
  description?: string;
  children: ReactNode;
}

export function GuestGate({ loggedInPromise, title, description, children }: Props) {
  const loggedIn = useResolved(loggedInPromise);

  if (loggedIn === undefined) return null;
  if (!loggedIn) return <GuestPrompt title={title} description={description} />;
  return <>{children}</>;
}
