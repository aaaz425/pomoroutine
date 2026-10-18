import { describe, expect, it } from 'vitest';
import type { Session } from '@/types';
import {
  patchSessionInList,
  patchSessionInPages,
  removeSessionFromList,
  removeSessionFromPages,
  type SessionPages,
} from './sessionCache';

function makeSession(id: string, note: string | null = null): Session {
  return {
    id,
    taskId: null,
    title: null,
    mode: 'pomodoro',
    startedAt: '2024-03-15T09:00:00.000Z',
    endedAt: '2024-03-15T09:25:00.000Z',
    completedCycles: 1,
    totalCycles: 1,
    focusSeconds: 1500,
    pausedSeconds: 0,
    focusPeriods: [],
    note,
    focusRating: null,
    distractionTags: [],
  };
}

function makePages(): SessionPages {
  return {
    pageParams: [null, 'cursor'],
    pages: [
      {
        sessions: [makeSession('a'), makeSession('b')],
        invalidCount: 0,
        nextCursor: 'cursor',
        totalCount: 3,
      },
      { sessions: [makeSession('c')], invalidCount: 0, nextCursor: null, totalCount: null },
    ],
  };
}

describe('patchSessionInPages', () => {
  it('해당 기록만 고치고 나머지 페이지는 그대로 둠', () => {
    const result = patchSessionInPages(makePages(), 'c', { note: '메모' });
    expect(result?.pages[1].sessions[0].note).toBe('메모');
    expect(result?.pages[0].sessions.every((s) => s.note === null)).toBe(true);
  });

  it('캐시가 없으면 그대로 반환', () => {
    expect(patchSessionInPages(undefined, 'a', { note: '메모' })).toBeUndefined();
  });
});

describe('removeSessionFromPages', () => {
  it('기록을 지우고 첫 페이지 전체 개수를 하나 줄임', () => {
    const result = removeSessionFromPages(makePages(), 'c');
    expect(result?.pages.flatMap((p) => p.sessions.map((s) => s.id))).toEqual(['a', 'b']);
    expect(result?.pages[0].totalCount).toBe(2);
  });

  it('없는 기록이면 개수를 바꾸지 않음', () => {
    const pages = makePages();
    expect(removeSessionFromPages(pages, 'none')).toBe(pages);
  });
});

describe('patchSessionInList / removeSessionFromList', () => {
  it('배열 캐시에서 기록을 고치고 지움', () => {
    const list = [makeSession('a'), makeSession('b')];
    expect(patchSessionInList(list, 'b', { note: '메모' })?.[1].note).toBe('메모');
    expect(removeSessionFromList(list, 'a')?.map((s) => s.id)).toEqual(['b']);
  });
});
