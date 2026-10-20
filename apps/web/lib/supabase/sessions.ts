import type { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import {
  DashboardSessionSchema,
  InsightSessionSchema,
  SessionSchema,
  type DashboardSession,
  type InsightSession,
  type Session,
  type SessionEditableFields,
} from '@/types';

interface SessionRow {
  id: string;
  task_id: string | null;
  title: string | null;
  mode: string;
  started_at: string;
  ended_at: string;
  completed_cycles: number;
  total_cycles: number;
  focus_seconds: number;
  paused_seconds: number;
  focus_periods: { start: string; end: string }[];
  note: string | null;
  focus_rating: number | null;
  distraction_tags: string[];
}

const SELECT_COLUMNS =
  'id, task_id, title, mode, started_at, ended_at, completed_cycles, total_cycles, focus_seconds, paused_seconds, focus_periods, note, focus_rating, distraction_tags';

function parseRows<T>(schema: z.ZodType<T>, rows: Partial<SessionRow>[]): T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse({
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      mode: row.mode,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      completedCycles: row.completed_cycles,
      totalCycles: row.total_cycles,
      focusSeconds: row.focus_seconds,
      pausedSeconds: row.paused_seconds,
      focusPeriods: row.focus_periods,
      note: row.note,
      focusRating: row.focus_rating,
      distractionTags: row.distraction_tags,
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export function toSession(row: SessionRow): Session | null {
  return parseRows(SessionSchema, [row])[0] ?? null;
}

export async function fetchSessionsInRange(startIso: string, endIso: string): Promise<Session[]> {
  const { data, error } = await createClient()
    .from('sessions')
    .select(SELECT_COLUMNS)
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return parseRows(SessionSchema, data);
}

export async function fetchDashboardSessions(
  startIso: string,
  endIso: string,
): Promise<DashboardSession[]> {
  const { data, error } = await createClient()
    .from('sessions')
    .select('id, task_id, started_at, focus_seconds, focus_periods')
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: true });
  if (error) throw error;
  return parseRows(DashboardSessionSchema, data);
}

interface SessionsPageParams {
  cursor?: string | null; // 이전 페이지 마지막 세션의 startedAt — 타이머 세션은 한 번에 하나씩만 생기므로 startedAt 단독으로 안정적인 커서가 된다
  limit: number;
  categoryIds?: string[];
  search?: string; // 작업 제목 검색
  startIso?: string;
  endIso?: string;
  withCount?: boolean;
}

export interface SessionsPageResult {
  sessions: Session[];
  nextCursor: string | null;
  totalCount: number | null;
}

// 카테고리/검색 필터는 tasks와 inner join해 서버에서 처리 — 미분류 세션은 필터 활성 시 제외됨(클라이언트 필터와 동일 동작)
export async function fetchSessionsPage({
  cursor,
  limit,
  categoryIds,
  search,
  startIso,
  endIso,
  withCount,
}: SessionsPageParams): Promise<SessionsPageResult> {
  const needsTaskJoin = !!(categoryIds?.length || search?.trim());
  const selectColumns = needsTaskJoin
    ? `${SELECT_COLUMNS}, tasks!inner(category_id, title)`
    : SELECT_COLUMNS;

  let query = createClient()
    .from('sessions')
    .select(selectColumns, withCount ? { count: 'exact' } : undefined)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('started_at', cursor);
  if (categoryIds?.length) query = query.in('tasks.category_id', categoryIds);
  if (search?.trim()) query = query.ilike('tasks.title', `%${search.trim()}%`);
  if (startIso) query = query.gte('started_at', startIso);
  if (endIso) query = query.lt('started_at', endIso);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data as unknown as SessionRow[];
  return {
    sessions: parseRows(SessionSchema, rows),
    nextCursor: rows.length === limit ? rows[rows.length - 1].started_at : null,
    totalCount: count ?? null,
  };
}

export async function fetchSessionStartTimes(startIso: string, endIso: string): Promise<string[]> {
  const { data, error } = await createClient()
    .from('sessions')
    .select('started_at')
    .gte('started_at', startIso)
    .lt('started_at', endIso);
  if (error) throw error;
  return data.map((row) => row.started_at as string);
}

export async function fetchInsightSessions(startIso: string): Promise<InsightSession[]> {
  const { data, error } = await createClient()
    .from('sessions')
    .select('id, task_id, started_at, focus_rating, distraction_tags')
    .gte('started_at', startIso);
  if (error) throw error;
  return parseRows(InsightSessionSchema, data);
}

export async function updateSession(
  id: string,
  patch: Partial<SessionEditableFields>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.focusRating !== undefined) row.focus_rating = patch.focusRating;
  if (patch.distractionTags !== undefined) row.distraction_tags = patch.distractionTags;
  if (patch.taskId !== undefined) row.task_id = patch.taskId;

  const { error } = await createClient().from('sessions').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await createClient().from('sessions').delete().eq('id', id);
  if (error) throw error;
}
