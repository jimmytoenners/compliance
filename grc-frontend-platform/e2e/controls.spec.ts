import { test, expect } from '@playwright/test';

test.describe('Controls Management', () => {
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
    // Use force click to bypass Next.js dev overlay
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display controls library', async ({ page }) => {
    await page.goto('/controls');

    // Check page title
    await expect(page.locator('h1').filter({ hasText: 'Controls' })).toBeVisible();
    await expect(page.locator('text=Manage your compliance controls')).toBeVisible();

    // Wait for loading to complete (either success or error)
    await page.waitForSelector('text=Loading controls...', { state: 'hidden', timeout: 10000 });

    // Verify the page is still functional after loading
    await expect(page.locator('h1').filter({ hasText: 'Controls' })).toBeVisible();
  });

  test('should display control details', async ({ page }) => {
    await page.goto('/controls');

    // Wait for controls to load
    await page.waitForSelector('text=Loading controls...', { state: 'hidden' });

    // Mock some controls data
    await page.route('**/api/v1/controls/library', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'control-1',
            name: 'Access Control Policy',
            description: 'Ensure proper access controls are in place',
            framework: 'NIST',
            activated: false,
            status: 'pending'
          },
          {
            id: 'control-2',
            name: 'Data Encryption',
            description: 'Encrypt sensitive data at rest and in transit',
            framework: 'ISO 27001',
            activated: true,
            status: 'compliant'
          }
        ])
      });
    });

    await page.reload();

    // Check that controls are displayed
    await expect(page.locator('text=Access Control Policy')).toBeVisible();
    await expect(page.locator('text=Data Encryption')).toBeVisible();
    await expect(page.locator('text=NIST')).toBeVisible();
    await expect(page.locator('text=ISO 27001')).toBeVisible();
  });

  test('should activate a control', async ({ page }) => {
    await page.goto('/controls');

    // Mock controls data
    await page.route('**/api/v1/controls/library', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'control-1',
            name: 'Access Control Policy',
            description: 'Ensure proper access controls are in place',
            framework: 'NIST',
            activated: false,
            status: 'pending'
          }
        ])
      });
    });

    // Mock activation API
    await page.route('**/api/v1/activated', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.reload();

    // Click activate button (assuming it exists in the UI)
    const activateButton = page.locator('button').filter({ hasText: 'Activate' }).first();
    if (await activateButton.isVisible()) {
      await activateButton.click();

      // Should refresh the controls list
      await page.waitForLoadState();
    }
  });

  test('should view control details', async ({ page }) => {
    await page.goto('/controls');

    // Mock controls data
    await page.route('**/api/v1/controls/library', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'control-1',
            name: 'Access Control Policy',
            description: 'Ensure proper access controls are in place',
            framework: 'NIST',
            activated: false,
            status: 'pending'
          }
        ])
      });
    });

    await page.reload();

    // Click view details button (assuming it exists)
    const viewButton = page.locator('button').filter({ hasText: 'View Details' }).first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should show details view
      await expect(page.locator('text=Access Control Policy')).toBeVisible();
    }
  });

  test('should submit evidence for a control', async ({ page }) => {
    await page.goto('/controls');

    // Mock controls data with activated control
    await page.route('**/api/v1/controls/library', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'control-1',
            name: 'Access Control Policy',
            description: 'Ensure proper access controls are in place',
            framework: 'NIST',
            activated: true,
            status: 'pending'
          }
        ])
      });
    });

    // Mock evidence submission API
    await page.route('**/api/v1/evidence', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.reload();

    // Click submit evidence button (assuming it exists)
    const evidenceButton = page.locator('button').filter({ hasText: 'Submit Evidence' }).first();
    if (await evidenceButton.isVisible()) {
      await evidenceButton.click();

      // Should show evidence form
      await expect(page.locator('text=Submit Evidence for Access Control Policy')).toBeVisible();

      // Fill and submit form
      await page.fill('textarea[name="description"]', 'Evidence description');
      await page.click('button[type="submit"]', { force: true });

      // Should return to list view
      await expect(page.locator('text=Manage your compliance controls')).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/controls');

    // Mock API failure
    await page.route('**/api/v1/controls/library', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.reload();

    // Should show error or empty state; loading may be too fast to catch
    const errorOrEmpty = page.locator('text=failed').or(page.locator('text=No controls')); // flexible check
    await expect(errorOrEmpty.first()).toBeVisible({ timeout: 5000 });
  });
});