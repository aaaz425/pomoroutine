import { makeHelpers, splitPeriods } from './lib/sessionGen.mjs';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS;
const MAX_BACKFILL_DAYS = 7;
const WINDOWS = [
  [7, 9],
  [12, 15],
  [18, 21],
];
const TAG_IDS = ['phone', 'noise', 'fatigue', 'people', 'notification', 'wandering'];
const NOTES_BY_CATEGORY = {
  공부: [
    '알고리즘 문제 두 개 풀었다. 그래프 탐색은 아직 손에 덜 익음',
    '어제 틀린 문제 다시 풀어봄, 이번엔 맞음',
    '강의 3강까지 듣고 노트 정리 완료',
    '단어 복습 끝, 내일은 새 챕터 시작',
  ],
  업무: [
    '초안 절반 정도 씀, 오후에 마저 정리',
    '리뷰 코멘트 정리하고 수정 사항 반영',
    '회의 전에 필요한 자료 다 모아둠',
  ],
  운동: ['몸이 무거웠는데 끝나고 나니 개운함', '목표 시간 채움, 다음엔 강도 조금 올리기'],
  독서: ['한 챕터 끝까지 읽음, 인상 깊은 문장 메모', '생각보다 술술 읽혀서 분량 더 채움'],
};
const GENERAL_NOTES = [
  '휴대폰을 다른 방에 두니까 확실히 덜 흔들렸다',
  '오후라 그런지 졸려서 중간에 스트레칭 한 번 함',
  '생각보다 집중이 잘 됐다. 이 시간대가 나랑 맞는 듯',
  '목표했던 분량은 못 채웠지만 흐름은 이어감',
];

const { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_EMAIL, DEMO_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DEMO_EMAIL || !DEMO_PASSWORD) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_EMAIL, DEMO_PASSWORD 환경 변수 필요');
}

const h = makeHelpers(Math.random);

async function request(path, token, { method = 'GET', body } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`데모 계정 로그인 실패: ${await res.text()}`);
  return (await res.json()).access_token;
}

function windowsBetween(fromMs, toMs) {
  const windows = [];
  const firstDay = Math.floor((fromMs + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;
  for (let day = firstDay; day < toMs; day += DAY_MS) {
    WINDOWS.forEach(([startHour, endHour], i) => {
      const start = day + startHour * HOUR_MS;
      const end = day + endHour * HOUR_MS;
      if (start >= fromMs && end <= toMs) windows.push({ start, end, first: i === 0 });
    });
  }
  return windows;
}

function generateSessions({ start, end }, tasks) {
  const sessions = [];
  const count = h.int(1, 2);
  let cursor = start + h.int(0, 20) * 60_000;
  for (let i = 0; i < count; i++) {
    const free = h.chance(0.15);
    const totalCycles = free ? 0 : h.int(1, 3);
    const focusSeconds = free ? h.int(20, 60) * 60 : totalCycles * 25 * 60 - h.int(0, 60);
    const pausedSeconds = h.chance(0.3) ? h.int(30, 240) : 0;
    const breakSeconds = free ? 0 : (totalCycles - 1) * 5 * 60;
    const { periods, endMs } = splitPeriods(cursor, focusSeconds, pausedSeconds + breakSeconds, h);
    if (endMs > end) break;
    const task = tasks.length > 0 && h.chance(0.9) ? h.pick(tasks) : null;
    const notes = NOTES_BY_CATEGORY[task?.categories?.name] ?? GENERAL_NOTES;
    sessions.push({
      task_id: task?.id ?? null,
      mode: free ? 'free' : 'pomodoro',
      started_at: new Date(cursor).toISOString(),
      ended_at: new Date(endMs).toISOString(),
      completed_cycles: totalCycles,
      total_cycles: totalCycles,
      focus_seconds: focusSeconds,
      paused_seconds: pausedSeconds,
      focus_periods: periods,
      note: h.chance(0.5) ? h.pick(notes) : null,
      focus_rating: h.chance(0.8) ? h.int(1, 3) : null,
      distraction_tags: Array.from(
        new Set(Array.from({ length: h.int(0, 2) }, () => h.pick(TAG_IDS))),
      ),
    });
    cursor = endMs + h.int(5, 30) * 60_000;
  }
  return sessions;
}

const token = await signIn();
const [latest] = await request(
  '/rest/v1/sessions?select=ended_at&order=ended_at.desc&limit=1',
  token,
);
const tasks = await request('/rest/v1/tasks?select=id,categories(name)', token);

const now = Date.now();
const from = Math.max(latest ? Date.parse(latest.ended_at) : 0, now - MAX_BACKFILL_DAYS * DAY_MS);
const sessions = windowsBetween(from, now)
  .filter((w) => w.first || h.chance(0.7))
  .flatMap((w) => generateSessions(w, tasks));

if (sessions.length > 0) {
  await request('/rest/v1/sessions', token, { method: 'POST', body: sessions });
}
console.log(`기록 ${sessions.length}건 추가`);
