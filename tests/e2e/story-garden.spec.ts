import { test, expect } from '@playwright/test';

test('opens the story garden and loads mocked stories', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '故事森林' })).toBeVisible();
  await expect(page.getByText(/7 stories/)).toBeVisible();
  await page.getByRole('button', { name: /Open the Book/i }).click();
  await expect(page).toHaveURL(/.*#\/read/);
  await expect(page.locator('.chrome__brand')).toBeVisible();
});

test('theme and music controls respond to real clicks', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await page.getByRole('button', { name: /切换到夜间模式/ }).click();
  await expect(root).toHaveAttribute('data-theme', 'night');
  await page.getByRole('button', { name: /播放配乐/ }).click();
  await expect(page.getByRole('button', { name: /暂停配乐/ })).toBeVisible();
});
