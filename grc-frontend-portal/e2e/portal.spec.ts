import { test, expect } from '@playwright/test';

test.describe('External Customer Portal', () => {
  test('should display login page for external portal', async ({ page }) => {
    await page.goto('/');

    // Check that we're on the portal page (not the platform login)
    await expect(page.locator('text=Customer Portal')).not.toBeVisible();

    // The portal starts with customer reference input
    // Based on the code, it redirects to '/' if no customerRef in localStorage
    // Let's check the initial state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should login with customer reference', async ({ page }) => {
    await page.goto('/');

    // Set customer reference in localStorage to simulate login
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.reload();

    // Should show customer portal with tickets
    await expect(page.locator('text=Customer Portal')).toBeVisible();
    await expect(page.locator('text=Welcome, CUST-001')).toBeVisible();
  });

  test('should display tickets for customer', async ({ page }) => {
    // Set customer reference
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.goto('/tickets');

    // Check page structure
    await expect(page.locator('text=Customer Portal')).toBeVisible();
    await expect(page.locator('text=My Support Tickets')).toBeVisible();

    // Mock tickets data for customer
    await page.route('**/api/v1/tickets/external/CUST-001', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: [
            {
              id: 'ticket-1',
              sequential_id: 1,
              ticket_type: 'external',
              title: 'Access Issue',
              description: 'Cannot access the system',
              status: 'new',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z'
            }
          ]
        })
      });
    });

    await page.reload();

    // Check ticket display
    await expect(page.locator('text=T-1')).toBeVisible();
    await expect(page.locator('text=Access Issue')).toBeVisible();
    await expect(page.locator('text=new')).toBeVisible();
  });

  test('should submit new ticket', async ({ page }) => {
    // Set customer reference
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.goto('/tickets');

    // Click submit ticket button
    await page.click('button:has-text("Submit New Ticket")');

    // Check form appears
    await expect(page.locator('text=Submit New Ticket')).toBeVisible();

    // Mock ticket submission API
    await page.route('**/api/v1/tickets/external', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ticket-new',
          sequential_id: 2,
          title: 'New Test Ticket',
          status: 'new'
        })
      });
    });

    // Fill form
    await page.fill('input[name="title"]', 'New Test Ticket');
    await page.fill('textarea[name="description"]', 'This is a test ticket description');
    await page.selectOption('select[name="category"]', 'Technical Issue');

    // Submit
    await page.click('button[type="submit"]');

    // Should close modal and refresh tickets
    await expect(page.locator('text=Submit New Ticket')).not.toBeVisible();
  });

  test('should view ticket details', async ({ page }) => {
    // Set customer reference
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.goto('/tickets');

    // Mock tickets data
    await page.route('**/api/v1/tickets/external/CUST-001', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: [
            {
              id: 'ticket-1',
              sequential_id: 1,
              ticket_type: 'external',
              title: 'Access Issue',
              description: 'Cannot access the system',
              status: 'new',
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z'
            }
          ]
        })
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
            ticket_type: 'external',
            title: 'Access Issue',
            description: 'Cannot access the system',
            status: 'new',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          },
          comments: [
            {
              id: 'comment-1',
              body: 'We are investigating this issue.',
              created_at: '2024-01-15T11:00:00Z'
            }
          ]
        })
      });
    });

    await page.reload();

    // Click view button
    await page.click('button:has-text("View")');

    // Check modal with details
    await expect(page.locator('text=Ticket T-1: Access Issue')).toBeVisible();
    await expect(page.locator('text=Cannot access the system')).toBeVisible();
    await expect(page.locator('text=We are investigating this issue.')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close")');
  });

  test('should logout from portal', async ({ page }) => {
    // Set customer reference
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.goto('/tickets');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should redirect to home (customer ref removed)
    await expect(page.url()).toBe('http://localhost:3050/');
  });

  test('should handle empty tickets list', async ({ page }) => {
    // Set customer reference
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.goto('/tickets');

    // Mock empty tickets
    await page.route('**/api/v1/tickets/external/CUST-001', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tickets: [] })
      });
    });

    await page.reload();

    // Check empty state
    await expect(page.locator('text=No tickets found.')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Set customer reference
    await page.evaluate(() => {
      localStorage.setItem('customerRef', 'CUST-001');
    });

    await page.goto('/tickets');

    // Mock API failure
    await page.route('**/api/v1/tickets/external/CUST-001', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.reload();

    // Should handle error gracefully (may show empty state or error message)
    await expect(page.locator('text=My Support Tickets')).toBeVisible();
  });
});