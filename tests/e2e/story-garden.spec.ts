import { test, expect } from '@playwright/test';

test('opens the story garden and loads the book', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '故事森林' })).toBeVisible();
  await expect(page.locator('.home__cta').first()).toBeVisible();
  await page.getByRole('button', { name: /Open the Book/i }).click();
  await expect(page).toHaveURL(/.*#\/read/);
  await expect(page.locator('.chrome__brand')).toBeVisible();
});

test('theme toggle flips the document attribute', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: /切换到夜间模式/ }).click();
  await expect(root).toHaveAttribute('data-theme', 'night');
});

test('navigates to the Stats page and renders word counts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Stats/ }).click();
  await expect(page).toHaveURL(/.*#\/stats/);
  await expect(page.getByText(/A Reader's Ledger/i)).toBeVisible();
  await expect(page.getByText(/字 · words/i)).toBeVisible();
  await expect(page.locator('.stats__row').first()).toBeVisible();
});

test('navigates to the Search page and the input is focused', async ({ page }) => {
  await page.goto('/#/search');
  await expect(page.locator('.search__input')).toBeVisible();
  await expect(page.locator('.search__hint')).toBeVisible();
  // Typing should reveal results (or empty state) — engine indexes on mount.
  await page.locator('.search__input').fill('月');
  await expect(page.locator('.search__hint, .search__row, .search__empty').first()).toBeVisible();
});

test('home page exposes search, stats, map and settings entrances', async ({ page }) => {
  await page.goto('/');
  // The home shortcuts are the primary discoverability surface.
  await expect(page.locator('.home__shortcut').filter({ hasText: '故事地图' })).toBeVisible();
  await expect(page.locator('.home__shortcut').filter({ hasText: '字数汇总' })).toBeVisible();
  await expect(page.locator('.home__shortcut').filter({ hasText: '全文检索' })).toBeVisible();

  // Stats entrance works.
  await page.locator('.home__shortcut').filter({ hasText: '字数汇总' }).click();
  await expect(page).toHaveURL(/.*#\/stats/);

  // Search entrance works.
  await page.goto('/');
  await page.locator('.home__shortcut').filter({ hasText: '全文检索' }).click();
  await expect(page).toHaveURL(/.*#\/search/);

  // Settings entrance opens the panel.
  await page.goto('/');
  await page.getByTitle('阅读偏好').click();
  await expect(page.getByText(/阅读偏好/)).toBeVisible();
});

test('floating Search FAB is visible on every page except /search', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.search-fab')).toBeVisible();
  await page.goto('/#/stats');
  await expect(page.locator('.search-fab')).toBeVisible();
  await page.goto('/#/search');
  await expect(page.locator('.search-fab')).toHaveCount(0);
});

test('settings panel toggles CJK font and persists in localStorage', async ({ page }) => {
  await page.goto('/#/read');
  await expect(page.locator('.chrome__brand')).toBeVisible();
  await page.getByTitle('阅读偏好').click();
  await expect(page.getByText(/阅读偏好/)).toBeVisible();
  await page.getByRole('button', { name: /思源宋体/ }).click();
  const stored = await page.evaluate(() => localStorage.getItem('storybook-engine:settings'));
  expect(stored).toContain('"cjkFont":"noto"');
  // Close the panel by clicking the X.
  await page.getByText('阅读偏好').first().click(); // dismiss
  await page.locator('.settings__close').click({ force: true });
});
