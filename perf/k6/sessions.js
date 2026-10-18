import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const ANON_KEY = __ENV.ANON_KEY;
const MODE = __ENV.MODE || 'single';
const ITERATIONS = Number(__ENV.ITERATIONS || 50);
const PASSWORD = 'perf1234';

const DATASETS = [
  { name: '100', email: 'perf-100@example.com' },
  { name: '1k', email: 'perf-1k@example.com' },
  { name: '10k', email: 'perf-10k@example.com' },
];
const ENDPOINTS = ['all', 'range', 'page', 'rpc'];
const COLUMNS =
  'id,task_id,title,mode,started_at,ended_at,completed_cycles,total_cycles,focus_seconds,paused_seconds,focus_periods,note,focus_rating,distraction_tags';

const duration = new Trend('perf_duration', true);
const bytes = new Trend('perf_bytes');
const failures = new Counter('perf_failures');

const targets =
  MODE === 'concurrent'
    ? [{ dataset: '10k', endpoint: 'all' }]
    : DATASETS.flatMap((d) => ENDPOINTS.map((e) => ({ dataset: d.name, endpoint: e })));

const thresholds = {};
for (const { dataset, endpoint } of targets) {
  thresholds[`perf_duration{dataset:${dataset},endpoint:${endpoint}}`] = ['max>=0'];
  thresholds[`perf_bytes{dataset:${dataset},endpoint:${endpoint}}`] = ['max>=0'];
}

export const options = {
  scenarios:
    MODE === 'concurrent'
      ? { concurrent: { executor: 'per-vu-iterations', vus: 10, iterations: 5, maxDuration: '5m' } }
      : { single: { executor: 'per-vu-iterations', vus: 1, iterations: 1, maxDuration: '10m' } },
  thresholds,
  summaryTrendStats: ['med', 'p(95)', 'min', 'max'],
};

function monthRangeKst() {
  const now = new Date(Date.now() + 9 * 3_600_000);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 9 * 3_600_000;
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 9 * 3_600_000;
  return [new Date(start).toISOString(), new Date(end).toISOString()];
}

export function setup() {
  if (!SUPABASE_URL || !ANON_KEY) throw new Error('SUPABASE_URL, ANON_KEY 필요');
  const tokens = {};
  for (const d of DATASETS) {
    const res = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: d.email, password: PASSWORD }),
      { headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' } },
    );
    if (res.status !== 200) throw new Error(`로그인 실패 ${d.email}: ${res.body}`);
    tokens[d.name] = res.json('access_token');
  }
  return { tokens };
}

function call(endpoint, token) {
  const params = {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    responseType: 'binary',
  };
  const rest = `${SUPABASE_URL}/rest/v1/sessions?select=${COLUMNS}`;
  if (endpoint === 'all') return http.get(`${rest}&order=started_at.desc`, params);
  if (endpoint === 'range') {
    const [start, end] = monthRangeKst();
    return http.get(
      `${rest}&started_at=gte.${start}&started_at=lt.${end}&order=started_at.asc`,
      params,
    );
  }
  if (endpoint === 'page') return http.get(`${rest}&order=started_at.desc&limit=20`, params);
  return http.post(
    `${SUPABASE_URL}/rest/v1/rpc/get_dashboard_summary`,
    JSON.stringify({ p_timezone: 'Asia/Seoul' }),
    params,
  );
}

export default function ({ tokens }) {
  const iterations = MODE === 'concurrent' ? 1 : ITERATIONS;
  for (const { dataset, endpoint } of targets) {
    call(endpoint, tokens[dataset]);
    for (let i = 0; i < iterations; i++) {
      const res = call(endpoint, tokens[dataset]);
      const tags = { dataset, endpoint };
      if (!check(res, { ok: (r) => r.status === 200 })) failures.add(1, tags);
      duration.add(res.timings.duration, tags);
      bytes.add(res.body ? res.body.byteLength : 0, tags);
    }
  }
}

function pad(value, width) {
  const s = String(value);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

export function handleSummary(data) {
  const rows = targets.map(({ dataset, endpoint }) => {
    const d = data.metrics[`perf_duration{dataset:${dataset},endpoint:${endpoint}}`];
    const b = data.metrics[`perf_bytes{dataset:${dataset},endpoint:${endpoint}}`];
    return {
      dataset,
      endpoint,
      medMs: d ? Number(d.values.med.toFixed(1)) : null,
      p95Ms: d ? Number(d.values['p(95)'].toFixed(1)) : null,
      bytes: b ? Math.round(b.values.med) : null,
    };
  });
  const header = `${pad('dataset', 8)}${pad('endpoint', 10)}${pad('med ms', 10)}${pad('p95 ms', 10)}bytes`;
  const lines = rows.map(
    (r) =>
      `${pad(r.dataset, 8)}${pad(r.endpoint, 10)}${pad(r.medMs, 10)}${pad(r.p95Ms, 10)}${r.bytes}`,
  );
  const failed = data.metrics.perf_failures ? data.metrics.perf_failures.values.count : 0;
  return {
    stdout: `\n${MODE}, 반복 ${MODE === 'concurrent' ? '10 VU x 5' : ITERATIONS}, 실패 ${failed}\n${header}\n${lines.join('\n')}\n`,
    [`perf/results/k6-${MODE}.json`]: JSON.stringify({ mode: MODE, failed, rows }, null, 2),
  };
}
