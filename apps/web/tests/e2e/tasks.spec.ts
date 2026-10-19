import { test, expect, type Page, type Locator } from '@playwright/test';
import { uniqueName } from './testUtils';

// 작업 생성 후 목록에 반영될 때까지 대기 — Supabase 비동기 저장 완료 확인 (레이스 방지)
async function createTask(page: Page, taskModal: Locator, name: string) {
  await taskModal.getByRole('button', { name: '새 작업 추가' }).click();
  const addModal = page.getByRole('dialog', { name: '새 작업 추가' });
  await expect(addModal).toBeVisible();

  await addModal.getByPlaceholder('예) 알고리즘 문제 풀기').fill(name);
  await addModal.getByRole('button', { name: '추가' }).click();

  await expect(addModal).not.toBeVisible();
  await expect(taskModal.getByText(name)).toBeVisible();
}

async function deleteTask(page: Page, taskModal: Locator, name: string) {
  const taskRow = taskModal.getByText(name).locator('xpath=ancestor::div[1]');
  await taskRow.getByRole('button', { name: '삭제' }).click();
  const confirm = page.getByRole('alertdialog');
  await confirm.getByRole('button', { name: '삭제' }).click();
  await expect(taskModal.getByText(name)).not.toBeVisible();
}

test.describe('작업 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: '환경설정' }).click();
  });

  test('작업 선택 후 타이머 연결', async ({ page }) => {
    const taskName = uniqueName();

    await page.getByRole('button', { name: '작업 관리' }).click();
    const taskModal = page.getByRole('dialog', { name: '작업 관리' });
    await createTask(page, taskModal, taskName);

    await page.goto('/');
    await page.getByRole('button', { name: '시작' }).click();
    const startModal = page.getByRole('dialog', { name: '타이머 시작' });
    await startModal.getByText(taskName).click();
    await startModal.getByRole('button', { name: '시작' }).click();

    await expect(page.getByText(taskName)).toBeVisible();

    // 정리 — 다음 테스트와 이름이 겹치지 않도록 생성한 작업을 삭제
    await page.goto('/settings');
    await page.getByRole('button', { name: '환경설정' }).click();
    await page.getByRole('button', { name: '작업 관리' }).click();
    await deleteTask(page, taskModal, taskName);
  });
});
