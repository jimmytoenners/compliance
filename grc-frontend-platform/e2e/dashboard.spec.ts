import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state and login before each test
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard with stats', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();

    // Check welcome message
    await expect(page.locator('text=Welcome to your GRC Platform')).toBeVisible();

    // Check stat cards are present
    await expect(page.locator('text=Total Controls')).toBeVisible();
    await expect(page.locator('text=Activated Controls')).toBeVisible();
    await expect(page.locator('text=Overdue Controls')).toBeVisible();
    await expect(page.locator('text=Total Tickets')).toBeVisible();

    // Check that stats are displayed (should be numbers, even if 0)
    const totalControlsStat = page.locator('text=Total Controls').locator('xpath=following-sibling::dd');
    await expect(totalControlsStat).toBeVisible();
    await expect(totalControlsStat).toHaveText(/\d+/);
  });

  test('should navigate to controls page', async ({ page }) => {
    // Click on navigation link to controls (assuming there's a nav)
    // Since the current UI might not have explicit nav links, we'll navigate directly
    await page.goto('/controls');
    await expect(page.locator('h1').filter({ hasText: 'Controls' })).toBeVisible();
  });

  test('should navigate to tickets page', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.locator('h1').filter({ hasText: 'Tickets' })).toBeVisible();
  });

  test('should load stats from API', async ({ page }) => {
    // Mock the API response to test different scenarios
    await page.route('**/api/v1/dashboard/summary', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalControls: 25,
          activatedControls: 15,
          overdueControls: 3,
          totalTickets: 8
        })
      });
    });

    // Reload the page to trigger the API call
    await page.reload();

    // Check that the mocked stats are displayed
    await expect(page.locator('text=Total Controls').locator('xpath=following-sibling::dd')).toHaveText('25');
    await expect(page.locator('text=Activated Controls').locator('xpath=following-sibling::dd')).toHaveText('15');
    await expect(page.locator('text=Overdue Controls').locator('xpath=following-sibling::dd')).toHaveText('3');
    await expect(page.locator('text=Total Tickets').locator('xpath=following-sibling::dd')).toHaveText('8');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/dashboard/summary', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.reload();

    // Should still show dashboard but with default values (0)
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();
    await expect(page.locator('text=Total Controls').locator('xpath=following-sibling::dd')).toHaveText('0');
  });
});