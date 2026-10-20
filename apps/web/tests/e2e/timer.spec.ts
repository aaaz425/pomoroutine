import { test, expect } from '@playwright/test';

// 첫 '시작' 클릭은 StartSessionModal을 띄우고, 모달 내 '시작'을 눌러야 타이머가 실제로 시작됨
async function startSession(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '시작' }).click();
  const modal = page.getByRole('dialog', { name: '타이머 시작' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: '시작' }).click();
  await expect(modal).not.toBeVisible();
}

test('타이머 시작, 일시정지, 30초 미만 종료', async ({ page }) => {
  await page.goto('/');
  await startSession(page);
  await expect(page.getByRole('button', { name: '정지' })).toBeVisible();

  await page.getByRole('button', { name: '정지' }).click();
  await expect(page.getByRole('button', { name: '시작' })).toBeVisible();

  await page.getByRole('button', { name: '종료' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '확인' }).click();

  await expect(page.getByText('30초 미만은 기록되지 않아요')).toBeVisible();
});
