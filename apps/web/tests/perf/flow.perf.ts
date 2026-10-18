import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { SupabaseRecorder } from './recorder';

const PASSWORD = 'perf1234';
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const DATASETS = (process.env.PERF_DATASETS ?? '100,1k,10k').split(',');
const QUIET_MS = 800;
const RESULTS_DIR = '../../perf/results/flow';

interface StepResult {
  step: string;
  readyMs: number;
  settleMs: number;
}

function navLink(page: Page, name: string) {
  return page.getByRole('link', { name, exact: true }).filter({ visible: true }).first();
}

type Ready = string | RegExp | { absentText: string };

async function waitReady(page: Page, ready: Ready) {
  if (typeof ready === 'object' && 'absentText' in ready) {
    await page.waitForFunction(
      (text) => !document.body.innerText.includes(text),
      ready.absentText,
      {
        polling: 'raf',
      },
    );
    return;
  }
  const pattern =
    typeof ready === 'string' ? ready.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ready.source;
  await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), pattern, {
    polling: 'raf',
  });
}

async function measure(
  page: Page,
  recorder: SupabaseRecorder,
  step: string,
  action: () => Promise<void>,
  ready: Ready,
): Promise<StepResult> {
  recorder.setStep(step);
  const start = Date.now();
  await action();
  await waitReady(page, ready);
  const readyMs = Date.now() - start;
  await recorder.waitForQuiet(page, QUIET_MS);
  return { step, readyMs, settleMs: Date.now() - start - QUIET_MS };
}

async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  }, state);
}

for (const dataset of DATASETS) {
  for (let run = 1; run <= RUNS; run++) {
    test(`${dataset} #${run}`, async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('이메일', { exact: true }).fill(`perf-${dataset}@example.com`);
      await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      await page.waitForURL('/');
      await page.goto('about:blank');

      const recorder = await SupabaseRecorder.attach(page, process.env.PERF_SUPABASE_URL!);
      const steps: StepResult[] = [];

      steps.push(
        await measure(
          page,
          recorder,
          'dashboard-enter',
          async () => {
            await page.goto('/dashboard');
          },
          '연속 집중일',
        ),
      );

      for (const [tab, label, focusLabel] of [
        ['today', '오늘', '오늘 집중 시간'],
        ['week', '이번 주', '이번 주 집중 시간'],
        ['month', '이번 달', '이번 달 집중 시간'],
        ['all', '전체', '전체 집중 시간'],
      ]) {
        steps.push(
          await measure(
            page,
            recorder,
            `tab-${tab}`,
            () => page.getByRole('button', { name: label, exact: true }).click(),
            focusLabel,
          ),
        );
      }

      steps.push(
        await measure(
          page,
          recorder,
          'journal-enter',
          () => navLink(page, '기록').click(),
          /측정용 작업 \d+/,
        ),
      );

      steps.push(
        await measure(
          page,
          recorder,
          'visibility-return',
          async () => {
            await setVisibility(page, 'hidden');
            await page.waitForTimeout(200);
            await setVisibility(page, 'visible');
          },
          /측정용 작업 \d+/,
        ),
      );

      steps.push(
        await measure(
          page,
          recorder,
          'dashboard-reenter',
          () => navLink(page, '통계').click(),
          '연속 집중일',
        ),
      );

      recorder.setStep('timer-setup');
      await navLink(page, '타이머').click();
      await page.getByRole('button', { name: '시작' }).click();
      const startModal = page.getByRole('dialog', { name: '타이머 시작' });
      await startModal.getByLabel('집중 시간 (단위: 분)').fill('1');
      await startModal.getByLabel('집중 시간 (단위: 분)').press('Enter');
      await startModal.getByLabel('사이클 (단위: 회)').fill('1');
      await startModal.getByLabel('사이클 (단위: 회)').press('Enter');
      await page.clock.install();
      await startModal.getByRole('button', { name: '시작' }).click();
      await expect(page.getByRole('button', { name: '정지' })).toBeVisible();
      await page.clock.fastForward('01:01');
      const recordModal = page.getByRole('dialog', { name: '기록 작성' });
      await expect(recordModal).toBeVisible();
      await recordModal.getByPlaceholder(/무엇을 집중해서 했나요/).fill('측정용 저장');
      await recordModal.getByRole('button', { name: '기록 완료' }).click();
      const saveConfirm = page.getByRole('alertdialog');
      await expect(saveConfirm).toBeVisible();
      await recorder.waitForQuiet(page, QUIET_MS);

      steps.push(
        await measure(
          page,
          recorder,
          'session-save',
          () => saveConfirm.getByRole('button', { name: '저장' }).click(),
          { absentText: '기록 작성' },
        ),
      );

      mkdirSync(RESULTS_DIR, { recursive: true });
      writeFileSync(
        `${RESULTS_DIR}/${dataset}-${run}.json`,
        JSON.stringify({ dataset, run, steps, requests: recorder.records }, null, 2),
      );
    });
  }
}
