import { execSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

function readLocalSupabase() {
  const out = execSync('npx supabase status -o env', { cwd: '../..', encoding: 'utf8' });
  const env = Object.fromEntries(
    out
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.API_URL ?? '')) {
    throw new Error(`로컬 Supabase가 아님: ${env.API_URL}`);
  }
  return { url: env.API_URL, anonKey: env.ANON_KEY };
}

const supabase = readLocalSupabase();
process.env.PERF_SUPABASE_URL = supabase.url;

export default defineConfig({
  testDir: './tests/perf',
  testMatch: /.*\.perf\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 180_000,
  expect: { timeout: 60_000 },
  globalSetup: './tests/perf/clean.ts',
  globalTeardown: './tests/perf/summarize.ts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: process.env.PERF_SKIP_BUILD
      ? `next start -p ${PORT}`
      : `next build --turbopack && next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
    },
  },
});
