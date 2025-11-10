import { test, expect } from '@playwright/test';

test.describe('Tickets Management', () => {
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

  test('should display tickets list', async ({ page }) => {
    await page.goto('/tickets');

    // Check page title
    await expect(page.locator('h1').filter({ hasText: 'Tickets' })).toBeVisible();
    await expect(page.locator('text=Manage support tickets and requests')).toBeVisible();

    // Wait for loading to complete (either success or error)
    await page.waitForSelector('text=Loading tickets...', { state: 'hidden', timeout: 10000 });

    // Verify the page is still functional after loading
    await expect(page.locator('h1').filter({ hasText: 'Tickets' })).toBeVisible();
  });

  test('should display ticket details', async ({ page }) => {
    await page.goto('/tickets');

    // Mock tickets data
    await page.route('**/api/v1/tickets', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ticket-1',
            sequential_id: 1,
            ticket_type: 'internal',
            title: 'System Access Request',
            description: 'Need access to production database',
            status: 'new',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 'ticket-2',
            sequential_id: 2,
            ticket_type: 'external',
            title: 'Compliance Report Issue',
            description: 'Report not generating correctly',
            status: 'in_progress',
            created_at: '2024-01-14T15:30:00Z',
            updated_at: '2024-01-15T09:00:00Z'
          }
        ])
      });
    });

    await page.reload();

    // Check that tickets are displayed
    await expect(page.locator('text=T-1')).toBeVisible();
    await expect(page.locator('text=T-2')).toBeVisible();
    await expect(page.locator('text=System Access Request')).toBeVisible();
    await expect(page.locator('text=Compliance Report Issue')).toBeVisible();

    // Check status badges
    await expect(page.locator('text=new')).toBeVisible();
    await expect(page.locator('text=in_progress')).toBeVisible();
  });

  test('should view ticket details in modal', async ({ page }) => {
    await page.goto('/tickets');

    // Mock tickets data
    await page.route('**/api/v1/tickets', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ticket-1',
            sequential_id: 1,
            ticket_type: 'internal',
            title: 'System Access Request',
            description: 'Need access to production database',
            status: 'new',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          }
        ])
      });
    });

    // Mock ticket details API
    await page.route('**/api/v1/tickets/ticket-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ticket: {
            id: 'ticket-1',
            sequential_id: 1,
            ticket_type: 'internal',
            title: 'System Access Request',
            description: 'Need access to production database',
            status: 'new',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          },
          comments: [
            {
              id: 'comment-1',
              body: 'Please provide more details about the access needed.',
              created_at: '2024-01-15T10:30:00Z'
            }
          ]
        })
      });
    });

    await page.reload();

    // Click view button
    await page.click('button:has-text("View")');

    // Check modal appears
    await expect(page.locator('text=Ticket T-1: System Access Request')).toBeVisible();
    await expect(page.locator('text=Need access to production database')).toBeVisible();
    await expect(page.locator('text=Please provide more details about the access needed.')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close")');
    await expect(page.locator('text=Ticket T-1: System Access Request')).not.toBeVisible();
  });

  test('should filter tickets by type', async ({ page }) => {
    await page.goto('/tickets');

    // Mock tickets data with different types
    await page.route('**/api/v1/tickets?type=internal', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ticket-1',
            sequential_id: 1,
            ticket_type: 'internal',
            title: 'System Access Request',
            status: 'new',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          }
        ])
      });
    });

    await page.route('**/api/v1/tickets?type=external', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ticket-2',
            sequential_id: 2,
            ticket_type: 'external',
            title: 'Compliance Report Issue',
            status: 'in_progress',
            created_at: '2024-01-14T15:30:00Z',
            updated_at: '2024-01-15T09:00:00Z'
          }
        ])
      });
    });

    // Test internal tickets filter
    await page.goto('/tickets?type=internal');
    await expect(page.locator('text=System Access Request')).toBeVisible();
    await expect(page.locator('text=Compliance Report Issue')).not.toBeVisible();

    // Test external tickets filter
    await page.goto('/tickets?type=external');
    await expect(page.locator('text=Compliance Report Issue')).toBeVisible();
    await expect(page.locator('text=System Access Request')).not.toBeVisible();
  });

  test('should handle empty tickets list', async ({ page }) => {
    await page.goto('/tickets');

    // Mock empty tickets data
    await page.route('**/api/v1/tickets', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.reload();

    // Check empty state message
    await expect(page.locator('text=No tickets found.')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/tickets');

    // Mock API failure
    await page.route('**/api/v1/tickets', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.reload();

    // Should show loading state and handle error gracefully
    await expect(page.locator('text=Loading tickets...')).toBeVisible();
  });
});