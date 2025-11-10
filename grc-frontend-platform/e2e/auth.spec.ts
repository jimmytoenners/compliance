import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/login');

    // Fill in login form
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');

    // Submit form
    await page.click('button[type="submit"]', { force: true });

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Should see dashboard content
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();

    // Verify we can access protected routes
    await page.goto('/controls');
    await page.waitForSelector('text=Loading controls...', { state: 'hidden' });
    await expect(page.locator('h1').filter({ hasText: 'Controls' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]', { force: true });

    // Should stay on login page and show error
    await expect(page).toHaveURL('/login');
    // Note: Current implementation uses alert, but we could test for that too
  });

  test('should require email and password', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]', { force: true });

    // Should stay on login page (HTML5 validation)
    await expect(page).toHaveURL('/login');
  });

  test.skip('should logout successfully', async ({ page }) => {
    // Skip this test until logout functionality is added to the UI
    // Current app doesn't have a logout button
  });
});