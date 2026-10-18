import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { RequestRecord } from './recorder';

const RESULTS_DIR = '../../perf/results/flow';
const STEP_ORDER = [
  'dashboard-enter',
  'tab-today',
  'tab-week',
  'tab-month',
  'tab-all',
  'journal-enter',
  'visibility-return',
  'dashboard-reenter',
  'timer-setup',
  'session-save',
];

interface RunFile {
  dataset: string;
  run: number;
  steps: { step: string; readyMs: number; settleMs: number }[];
  requests: RequestRecord[];
}

interface StepStats {
  requests: number;
  duplicates: number;
  bodyBytes: number;
  gzipBytes: number;
  readyMs: number | null;
  settleMs: number | null;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function statsForRun(run: RunFile) {
  const seen = new Set<string>();
  const byStep = new Map<string, StepStats>();
  for (const step of STEP_ORDER) {
    const timing = run.steps.find((s) => s.step === step);
    byStep.set(step, {
      requests: 0,
      duplicates: 0,
      bodyBytes: 0,
      gzipBytes: 0,
      readyMs: timing?.readyMs ?? null,
      settleMs: timing?.settleMs ?? null,
    });
  }
  for (const r of run.requests) {
    const s = byStep.get(r.step);
    if (!s) continue;
    s.requests++;
    s.bodyBytes += r.bodyBytes;
    s.gzipBytes += r.gzipBytes;
    if (seen.has(r.key)) s.duplicates++;
    seen.add(r.key);
  }
  return byStep;
}

function kb(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)}MB`
    : `${(bytes / 1024).toFixed(1)}KB`;
}

function pad(value: string | number, width: number) {
  return String(value).padEnd(width);
}

export default function summarize() {
  if (!existsSync(RESULTS_DIR)) return;
  const runs: RunFile[] = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${RESULTS_DIR}/${f}`, 'utf8')));
  const datasets = [...new Set(runs.map((r) => r.dataset))].sort(
    (a, b) =>
      parseFloat(a) * (a.endsWith('k') ? 1000 : 1) - parseFloat(b) * (b.endsWith('k') ? 1000 : 1),
  );
  const summary: Record<string, unknown> = {};
  const lines: string[] = [];

  for (const dataset of datasets) {
    const dsRuns = runs.filter((r) => r.dataset === dataset);
    const perRun = dsRuns.map(statsForRun);
    const rows = STEP_ORDER.map((step) => {
      const list = perRun.map((m) => m.get(step)!);
      const timed = (k: 'readyMs' | 'settleMs') =>
        list[0][k] === null ? null : Math.round(median(list.map((s) => s[k] ?? 0)));
      return {
        step,
        requests: median(list.map((s) => s.requests)),
        duplicates: median(list.map((s) => s.duplicates)),
        bodyBytes: Math.round(median(list.map((s) => s.bodyBytes))),
        gzipBytes: Math.round(median(list.map((s) => s.gzipBytes))),
        readyMs: timed('readyMs'),
        settleMs: timed('settleMs'),
      };
    });
    const totals = {
      requests: median(perRun.map((m) => [...m.values()].reduce((a, s) => a + s.requests, 0))),
      duplicates: median(perRun.map((m) => [...m.values()].reduce((a, s) => a + s.duplicates, 0))),
      bodyBytes: Math.round(
        median(perRun.map((m) => [...m.values()].reduce((a, s) => a + s.bodyBytes, 0))),
      ),
      gzipBytes: Math.round(
        median(perRun.map((m) => [...m.values()].reduce((a, s) => a + s.gzipBytes, 0))),
      ),
    };
    const endpoints = new Map<string, number>();
    for (const r of dsRuns[0].requests) {
      if (!STEP_ORDER.includes(r.step)) continue;
      const name = `${r.step} ${r.method} ${r.url}`;
      endpoints.set(name, (endpoints.get(name) ?? 0) + 1);
    }
    summary[dataset] = {
      runs: dsRuns.length,
      rows,
      totals,
      endpointsRun1: Object.fromEntries(endpoints),
    };

    lines.push(`\n[${dataset}] ${dsRuns.length}회 중앙값`);
    lines.push(
      `${pad('step', 20)}${pad('req', 6)}${pad('dup', 6)}${pad('body', 11)}${pad('gzip', 11)}${pad('ready', 8)}settle`,
    );
    for (const r of rows) {
      lines.push(
        `${pad(r.step, 20)}${pad(r.requests, 6)}${pad(r.duplicates, 6)}${pad(kb(r.bodyBytes), 11)}${pad(kb(r.gzipBytes), 11)}${pad(r.readyMs ?? '-', 8)}${r.settleMs ?? '-'}`,
      );
    }
    lines.push(
      `${pad('total', 20)}${pad(totals.requests, 6)}${pad(totals.duplicates, 6)}${pad(kb(totals.bodyBytes), 11)}${kb(totals.gzipBytes)}`,
    );
  }

  writeFileSync('../../perf/results/flow-summary.json', JSON.stringify(summary, null, 2));
  console.log(lines.join('\n'));
}
