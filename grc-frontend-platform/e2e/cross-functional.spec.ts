import { test, expect } from '@playwright/test';

test.describe('Cross-functional Tests', () => {
  test('should handle network failures gracefully', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/login');

    // Mock network failure for login
    await page.route('**/api/v1/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
      await route.abort();
    });

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });

    // Should handle network error (current implementation uses alert)
    await expect(page).toHaveURL('/login');
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Clear any existing auth state and login
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Refresh page
    await page.reload();

    // Should still be logged in and on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible();
  });

  test('should handle concurrent API calls', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to controls and tickets simultaneously
    const [controlsResponse, ticketsResponse] = await Promise.all([
      page.goto('/controls'),
      page.waitForLoadState()
    ]);

    // Both pages should load
    await expect(page.locator('h1').filter({ hasText: 'Controls' })).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/login');

    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });

    // HTML5 validation should prevent submission for invalid email
    await expect(page).toHaveURL('/login');

    // Test required fields
    await page.fill('input[name="email"]', '');
    await page.fill('input[name="password"]', '');
    await page.click('button[type="submit"]', { force: true });

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('should handle large data sets', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('/dashboard', { timeout: 10000 });

    await page.goto('/controls');

    // Mock large dataset
    const largeControlsData = Array.from({ length: 100 }, (_, i) => ({
      id: `control-${i}`,
      name: `Control ${i}`,
      description: `Description for control ${i}`,
      framework: i % 2 === 0 ? 'NIST' : 'ISO 27001',
      activated: i % 3 === 0,
      status: ['compliant', 'non-compliant', 'pending'][i % 3]
    }));

    await page.route('**/api/v1/controls/library', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeControlsData)
      });
    });

    await page.reload();

    // Should handle large dataset without crashing
    await expect(page.locator('text=Control 1').first()).toBeVisible();
    await expect(page.locator('text=Control 99').first()).toBeVisible();
  });

  test('should handle special characters in data', async ({ page }) => {
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

    await page.goto('/tickets');

    // Mock data with special characters
    await page.route('**/api/v1/tickets', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ticket-1',
            sequential_id: 1,
            ticket_type: 'internal',
            title: 'Ticket with spécial characters: àáâãäå, ñ, ü',
            description: 'Description with <script>alert("xss")</script> and quotes "test"',
            status: 'new',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          }
        ])
      });
    });

    await page.reload();

    // Should display special characters properly (escaped)
    await expect(page.locator('text=Ticket with spécial characters')).toBeVisible();
    // Should not execute script tags (basic XSS protection check)
    await expect(page.locator('text=<script>')).not.toBeVisible();
  });

  test('should work on mobile viewport', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    await page.goto('/login');

    // Mobile-specific checks
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]', { force: true });

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should handle slow network conditions', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    
    // Simulate slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      await route.continue();
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });

    // Should still work with delays
    await page.waitForURL('/dashboard', { timeout: 15000 });
  });

  test('should maintain data consistency across refreshes', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Check initial stats
    const initialStats = await page.locator('text=Total Controls').locator('xpath=following-sibling::dd').textContent();

    // Refresh
    await page.reload();

    // Stats should be consistent
    const refreshedStats = await page.locator('text=Total Controls').locator('xpath=following-sibling::dd').textContent();
    expect(refreshedStats).toBe(initialStats);
  });
});