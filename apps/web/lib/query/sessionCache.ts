import type { InfiniteData } from '@tanstack/react-query';
import type { SessionsPageResult } from '@/lib/supabase/sessions';
import type { Session } from '@/types';

export type SessionPages = InfiniteData<SessionsPageResult, string | null>;

export function patchSessionInPages(
  data: SessionPages | undefined,
  id: string,
  patch: Partial<Session>,
): SessionPages | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      sessions: page.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  };
}

export function removeSessionFromPages(
  data: SessionPages | undefined,
  id: string,
): SessionPages | undefined {
  if (!data) return data;
  const removed = data.pages.some((page) => page.sessions.some((s) => s.id === id));
  if (!removed) return data;
  return {
    ...data,
    pages: data.pages.map((page, i) => ({
      ...page,
      sessions: page.sessions.filter((s) => s.id !== id),
      totalCount:
        i === 0 && page.totalCount !== null ? Math.max(0, page.totalCount - 1) : page.totalCount,
    })),
  };
}

export function patchSessionInList(
  data: Session[] | undefined,
  id: string,
  patch: Partial<Session>,
): Session[] | undefined {
  return data?.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function removeSessionFromList(
  data: Session[] | undefined,
  id: string,
): Session[] | undefined {
  return data?.filter((s) => s.id !== id);
}
