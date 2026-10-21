import { execSync } from 'node:child_process';
import { makeHelpers, splitPeriods } from '../../scripts/lib/sessionGen.mjs';

const DATASETS = [
  { email: 'perf-100@example.com', count: 100 },
  { email: 'perf-1k@example.com', count: 1000 },
  { email: 'perf-10k@example.com', count: 10000 },
];
const PASSWORD = 'perf1234';

const TAG_IDS = ['phone', 'noise', 'fatigue', 'people', 'notification', 'wandering'];
const NOTE_WORDS = [
  '오늘은',
  '생각보다',
  '집중이',
  '잘',
  '안',
  '됐다',
  '알고리즘',
  '문제를',
  '풀었고',
  '복습',
  '정리',
  '내일은',
  '조금',
  '더',
  '일찍',
  '시작하기',
  '휴대폰을',
  '멀리',
  '두니까',
  '좋았다',
  '챕터',
  '끝까지',
  '읽음',
  '중간에',
  '졸려서',
  '스트레칭',
];

function readLocalEnv() {
  const out = execSync('npx supabase status -o env', { encoding: 'utf8' });
  const env = Object.fromEntries(
    out
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  const apiUrl = env.API_URL;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(apiUrl ?? '')) {
    throw new Error(`로컬 Supabase가 아님: ${apiUrl}`);
  }
  return { apiUrl, token: env.SERVICE_ROLE_KEY, anonKey: env.ANON_KEY };
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNote({ int, pick }) {
  const target = int(30, 200);
  let note = '';
  while (note.length < target) note += (note ? ' ' : '') + pick(NOTE_WORDS);
  return note.slice(0, target);
}

function generateSessions(count, taskIds, seed) {
  const rand = mulberry32(seed);
  const h = makeHelpers(rand);
  const sessions = [];
  const kstMidnight = new Date();
  kstMidnight.setUTCHours(-9, 0, 0, 0);
  let dayOffset = 1;
  while (sessions.length < count) {
    const perDay = h.chance(0.1) ? 0 : h.int(1, 12);
    const dayStart = kstMidnight.getTime() - dayOffset * 86_400_000;
    let cursor = dayStart + h.int(7, 10) * 3_600_000;
    for (let i = 0; i < perDay && sessions.length < count; i++) {
      const free = h.chance(0.15);
      const totalCycles = free ? 0 : h.int(1, 4);
      const completedCycles = free ? 0 : h.int(Math.max(1, totalCycles - 1), totalCycles);
      const focusSeconds = free ? h.int(10, 90) * 60 : completedCycles * 25 * 60 - h.int(0, 120);
      const pausedSeconds = h.chance(0.4) ? h.int(10, 300) : 0;
      const breakSeconds = free ? 0 : Math.max(0, completedCycles - 1) * 5 * 60;
      const { periods, endMs } = splitPeriods(
        cursor,
        focusSeconds,
        pausedSeconds + breakSeconds,
        h,
      );
      if (endMs > dayStart + 31 * 3_600_000) break;
      sessions.push({
        task_id: h.chance(0.1) ? null : h.pick(taskIds),
        mode: free ? 'free' : 'pomodoro',
        started_at: new Date(cursor).toISOString(),
        ended_at: new Date(endMs).toISOString(),
        completed_cycles: completedCycles,
        total_cycles: totalCycles,
        focus_seconds: focusSeconds,
        paused_seconds: pausedSeconds,
        focus_periods: periods,
        note: h.chance(0.5) ? makeNote(h) : null,
        focus_rating: h.chance(0.7) ? h.int(1, 3) : null,
        distraction_tags: Array.from(
          new Set(Array.from({ length: h.int(0, 3) }, () => h.pick(TAG_IDS))),
        ),
      });
      cursor = endMs + h.int(10, 90) * 60_000;
    }
    dayOffset++;
  }
  return { sessions, days: dayOffset };
}

async function request(env, path, { method = 'GET', body, token = env.token, prefer } = {}) {
  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function ensureUser(env, email) {
  const list = await request(env, '/auth/v1/admin/users?per_page=1000');
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const created = await request(env, '/auth/v1/admin/users', {
    method: 'POST',
    body: { email, password: PASSWORD, email_confirm: true },
  });
  return created.id;
}

async function signIn(env, email) {
  const res = await fetch(`${env.apiUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`로그인 실패 ${email}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function seedUser(adminEnv, { email, count }, seed) {
  const userId = await ensureUser(adminEnv, email);
  const env = { ...adminEnv, token: await signIn(adminEnv, email) };
  await request(env, `/rest/v1/sessions?user_id=eq.${userId}`, { method: 'DELETE' });
  await request(env, `/rest/v1/tasks?user_id=eq.${userId}`, { method: 'DELETE' });

  const categories = await request(
    env,
    `/rest/v1/categories?user_id=eq.${userId}&select=id&order=position`,
  );
  const tasks = await request(env, '/rest/v1/tasks?select=id', {
    method: 'POST',
    prefer: 'return=representation',
    body: Array.from({ length: 20 }, (_, i) => ({
      user_id: userId,
      category_id: categories[i % categories.length].id,
      title: `측정용 작업 ${i + 1}`,
      position: i,
    })),
  });

  const { sessions, days } = generateSessions(
    count,
    tasks.map((t) => t.id),
    seed,
  );
  for (let i = 0; i < sessions.length; i += 1000) {
    await request(env, '/rest/v1/sessions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: sessions.slice(i, i + 1000).map((s) => ({ ...s, user_id: userId })),
    });
  }
  const withNote = sessions.filter((s) => s.note).length;
  const avgPeriods = sessions.reduce((sum, s) => sum + s.focus_periods.length, 0) / sessions.length;
  console.log(
    `${email}: ${sessions.length}건, ${days}일, 카테고리 ${categories.length}개, 작업 ${tasks.length}개, 메모 ${withNote}건, 평균 집중 구간 ${avgPeriods.toFixed(1)}개`,
  );
}

const env = readLocalEnv();
for (const [i, dataset] of DATASETS.entries()) {
  await seedUser(env, dataset, 20261018 + i);
}
