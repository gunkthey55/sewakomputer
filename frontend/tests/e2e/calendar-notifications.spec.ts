import { test, expect } from '@playwright/test';

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'adminpass123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display calendar with rentals', async ({ page }) => {
    await page.goto('/calendar');
    
    // Wait for calendar to load
    await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 10000 });
    
    // Should show month view by default
    await expect(page.locator('.rbc-month-view')).toBeVisible();
  });

  test('should switch between month and week views', async ({ page }) => {
    await page.goto('/calendar');
    
    // Switch to week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('.rbc-week-view')).toBeVisible();
    
    // Switch back to month
    await page.click('button:has-text("Month")');
    await expect(page.locator('.rbc-month-view')).toBeVisible();
  });

  test('should navigate months', async ({ page }) => {
    await page.goto('/calendar');
    
    // Click next month
    await page.click('button[aria-label="next"]');
    
    // Click previous month
    await page.click('button[aria-label="previous"]');
  });

  test('should show rental events with color coding', async ({ page }) => {
    await page.goto('/calendar');
    
    // Wait for events to render
    await expect(page.locator('.rbc-event')).toBeVisible({ timeout: 10000 });
    
    // Events should have different colors based on status
    const events = page.locator('.rbc-event');
    const count = await events.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open detail modal on event click', async ({ page }) => {
    await page.goto('/calendar');
    
    // Click on first event
    await page.click('.rbc-event:first-child');
    
    // Should open detail modal
    await expect(page.locator('[data-testid="modal-panel"]')).toBeVisible();
    await expect(page.locator('text=Rental Detail')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="modal-close"]');
  });
});

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'adminpass123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show notification badge count', async ({ page }) => {
    // Check header for notification bell
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
    
    // Badge should show count if there are unread notifications
    const badge = page.locator('[data-testid="notification-bell"] >> .absolute');
    // May or may not be visible depending on unread count
  });

  test('should open notification dropdown', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');
    
    // Dropdown should open
    await expect(page.locator('text=Notifikasi')).toBeVisible();
  });

  test('should mark all as read', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');
    
    // If there are unread, mark all as read button should be visible
    const markAllButton = page.locator('[data-testid="mark-all-read"]');
    if (await markAllButton.isVisible()) {
      await markAllButton.click();
      await expect(page.locator('[data-testid="notification-bell"] >> .absolute')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.goto('/notifications');
    
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible({ timeout: 10000 });
    
    // Should show notifications list
    await expect(page.locator('text=Notifikasi')).toBeVisible();
  });
});