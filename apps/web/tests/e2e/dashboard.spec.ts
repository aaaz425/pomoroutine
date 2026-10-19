import { test, expect } from '@playwright/test';

test('통계 화면 렌더링과 기간 탭 전환', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('연속 집중일').first()).toBeVisible();
  await expect(page.getByText('이번 주 집중 시간').first()).toBeVisible();

  await page.getByRole('button', { name: '오늘' }).click();
  await expect(page.getByText('오늘 집중 시간').first()).toBeVisible();

  await page.getByRole('button', { name: '이번 달' }).click();
  await expect(page.getByText('이번 달 집중 시간').first()).toBeVisible();

  await page.getByRole('button', { name: '전체' }).click();
  await expect(page.getByText('전체 집중 시간').first()).toBeVisible();
});
