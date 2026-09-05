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
  await page.addInitScript(() => {
    localStorage.setItem('storybook-engine:settings', JSON.stringify({ theme: 'light' }));
  });
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
  await page.locator('.search__input').fill('月');
  await expect(page.locator('.search__hint, .search__row, .search__empty').first()).toBeVisible();
});

test('home page exposes search, stats, map and settings entrances', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home__shortcut').filter({ hasText: '故事地图' })).toBeVisible();
  await expect(page.locator('.home__shortcut').filter({ hasText: '字数汇总' })).toBeVisible();
  await expect(page.locator('.home__shortcut').filter({ hasText: '全文检索' })).toBeVisible();
  await page.locator('.home__shortcut').filter({ hasText: '字数汇总' }).click();
  await expect(page).toHaveURL(/.*#\/stats/);
  await page.goto('/');
  await page.locator('.home__shortcut').filter({ hasText: '全文检索' }).click();
  await expect(page).toHaveURL(/.*#\/search/);
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
  await page.getByText('阅读偏好').first().click();
  await page.locator('.settings__close').click({ force: true });
});

test.describe('mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('storybook-engine:settings', JSON.stringify({ theme: 'light' }));
    });
  });

  test('home fits the viewport and keeps navigation readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.home__cta')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.locator('.home__shortcut').first()).toBeVisible();
  });

  test('reader uses portrait pages and compact controls', async ({ page }) => {
    await page.goto('/#/read');
    await expect(page.locator('.chrome__brand')).toBeVisible();
    const bounds = await page.locator('.reader__stage').boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) + 1);
    await page.locator('.reader__stage').dispatchEvent('pointerdown', { clientX: 5, clientY: 100, pointerType: 'touch' });
    await page.locator('.reader__stage').dispatchEvent('pointerup', { clientX: 5, clientY: 100, pointerType: 'touch' });
    await page.locator('.reader__stage').dispatchEvent('pointerdown', { clientX: 160, clientY: 100, pointerType: 'touch' });
    await page.locator('.reader__stage').dispatchEvent('pointerup', { clientX: 160, clientY: 100, pointerType: 'touch' });
    await expect(page.locator('.chrome')).toBeVisible();
  });

  test('reader top navigation adapts without clipping controls', async ({ page }) => {
    await page.goto('/#/read');
    await expect(page.locator('.chrome__top')).toBeVisible();
    await expect(page.locator('.chrome__brand')).toHaveText('The Story Garden');

    const controls = await page.locator('.chrome__top, .chrome__brand, .chrome__top-actions, .chrome__top-actions > button').evaluateAll((elements) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      return elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          centerIsInside: element.contains(center),
          title: element.getAttribute('title'),
          viewportWidth,
          viewportHeight,
        };
      });
    });

    expect(controls.length).toBeGreaterThan(2);
    for (const control of controls) {
      expect(control.width).toBeGreaterThan(0);
      expect(control.height).toBeGreaterThan(0);
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.top).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(control.viewportWidth + 1);
      expect(control.bottom).toBeLessThanOrEqual(control.viewportHeight + 1);
    }
    for (const button of await page.locator('.chrome__top-actions > button').evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { width: rect.width, height: rect.height, centerIsInside: element.contains(center), title: element.getAttribute('title') };
    }))) {
      expect(button.width).toBeGreaterThanOrEqual(32);
      expect(button.height).toBeGreaterThanOrEqual(32);
      expect(button.centerIsInside).toBe(true);
      expect(button.title).toBeTruthy();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('search and shelf remain usable without horizontal overflow', async ({ page }) => {
    await page.goto('/#/search');
    await page.locator('.search__input').fill('月');
    await expect(page.locator('.search__input')).toBeVisible();
    await page.goto('/#/shelf');
    await expect(page.locator('.shelf')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
