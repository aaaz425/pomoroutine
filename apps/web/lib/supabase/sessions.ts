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

export function toSession(row: SessionRow): Session | null {
  const parsed = SessionSchema.safeParse({
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
  return parsed.success ? parsed.data : null;
}

interface SessionListResult {
  sessions: Session[];
  invalidCount: number;
}

export async function fetchSessionsInRange(
  startIso: string,
  endIso: string,
): Promise<SessionListResult | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select(SELECT_COLUMNS)
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: true });
  if (error || !data) return null;
  const sessions = data.map(toSession).filter((s): s is Session => s !== null);
  return { sessions, invalidCount: data.length - sessions.length };
}

interface DashboardSessionRow {
  id: string;
  task_id: string | null;
  started_at: string;
  focus_seconds: number;
  focus_periods: { start: string; end: string }[];
}

export function toDashboardSession(row: DashboardSessionRow): DashboardSession | null {
  const parsed = DashboardSessionSchema.safeParse({
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    focusSeconds: row.focus_seconds,
    focusPeriods: row.focus_periods,
  });
  return parsed.success ? parsed.data : null;
}

export async function fetchDashboardSessions(
  startIso: string,
  endIso: string,
): Promise<DashboardSession[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, task_id, started_at, focus_seconds, focus_periods')
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: true });
  if (error || !data) return null;
  return data.map(toDashboardSession).filter((s): s is DashboardSession => s !== null);
}

export interface SessionsPageParams {
  cursor?: string | null; // 이전 페이지 마지막 세션의 startedAt — 타이머 세션은 한 번에 하나씩만 생기므로 startedAt 단독으로 안정적인 커서가 된다
  limit: number;
  categoryIds?: string[];
  search?: string; // 작업 제목 검색
  startIso?: string;
  endIso?: string;
  withCount?: boolean;
}

export interface SessionsPageResult extends SessionListResult {
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
}: SessionsPageParams): Promise<SessionsPageResult | null> {
  const supabase = createClient();
  const needsTaskJoin = !!(categoryIds?.length || search?.trim());
  const selectColumns = needsTaskJoin
    ? `${SELECT_COLUMNS}, tasks!inner(category_id, title)`
    : SELECT_COLUMNS;

  let query = supabase
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
  if (error || !data) return null;

  const rows = data as unknown as SessionRow[];
  const sessions = rows.map(toSession).filter((s): s is Session => s !== null);
  const nextCursor = rows.length === limit ? rows[rows.length - 1].started_at : null;
  return {
    sessions,
    invalidCount: rows.length - sessions.length,
    nextCursor,
    totalCount: count ?? null,
  };
}

export async function fetchSessionStartTimes(
  startIso: string,
  endIso: string,
): Promise<string[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('started_at')
    .gte('started_at', startIso)
    .lt('started_at', endIso);
  if (error || !data) return null;
  return data.map((row) => row.started_at as string);
}

interface InsightSessionRow {
  id: string;
  task_id: string | null;
  started_at: string;
  focus_rating: number | null;
  distraction_tags: string[];
}

export function toInsightSession(row: InsightSessionRow): InsightSession | null {
  const parsed = InsightSessionSchema.safeParse({
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    focusRating: row.focus_rating,
    distractionTags: row.distraction_tags,
  });
  return parsed.success ? parsed.data : null;
}

export async function fetchInsightSessions(startIso: string): Promise<InsightSession[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, task_id, started_at, focus_rating, distraction_tags')
    .gte('started_at', startIso);
  if (error || !data) return null;
  return data.map(toInsightSession).filter((s): s is InsightSession => s !== null);
}

export async function insertSession(input: Omit<Session, 'id'>): Promise<Session | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      task_id: input.taskId,
      title: input.title,
      mode: input.mode,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      completed_cycles: input.completedCycles,
      total_cycles: input.totalCycles,
      focus_seconds: input.focusSeconds,
      paused_seconds: input.pausedSeconds,
      focus_periods: input.focusPeriods,
      note: input.note,
      focus_rating: input.focusRating,
      distraction_tags: input.distractionTags,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) return null;
  return toSession(data);
}

export async function updateSession(
  id: string,
  patch: Partial<SessionEditableFields>,
): Promise<{ error: boolean }> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.focusRating !== undefined) row.focus_rating = patch.focusRating;
  if (patch.distractionTags !== undefined) row.distraction_tags = patch.distractionTags;
  if (patch.taskId !== undefined) row.task_id = patch.taskId;

  const { error } = await supabase.from('sessions').update(row).eq('id', id);
  return { error: error !== null };
}

export async function deleteSession(id: string): Promise<{ error: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  return { error: error !== null };
}
