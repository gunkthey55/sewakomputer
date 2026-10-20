import { test, expect } from '@playwright/test';

test.describe('Smoke Test - Full Happy Path', () => {
  test('complete rental workflow: login -> create -> list -> calendar -> notifications -> logout', async ({ page }) => {
    // ===== LOGIN =====
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
    
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'adminpass123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
    
    // Verify dashboard loads with stats
    await expect(page.locator('[data-testid="stat-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions-content"]')).toBeVisible();
    
    // ===== CREATE RENTAL =====
    await page.goto('/rentals/create');
    await expect(page.locator('text=Create Rental')).toBeVisible({ timeout: 10000 });
    
    // Step 1: Customer info
    await page.fill('input[name="customer_name"]', 'Smoke Test Customer');
    await page.fill('input[name="customer_phone"]', '081234567890');
    await page.fill('input[name="customer_email"]', 'smoke@test.com');
    await page.click('button:has-text("Next")');
    
    // Step 2: Select computer
    await expect(page.locator('text=Select Computer')).toBeVisible();
    await page.click('[data-testid="computer-option-0"]');
    await page.click('button:has-text("Next")');
    
    // Step 3: Components (skip)
    await page.click('button:has-text("Next")');
    
    // Step 4: Duration
    await expect(page.locator('text=Rental Duration')).toBeVisible();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    
    await page.fill('input[name="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="end_date"]', endDate.toISOString().split('T')[0]);
    await page.fill('input[name="deposit"]', '100000');
    await page.click('button:has-text("Next")');
    
    // Step 5: Summary
    await expect(page.locator('text=Summary')).toBeVisible();
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=Rental created successfully')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*rentals/);
    
    // ===== LIST RENTALS =====
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible({ timeout: 10000 });
    
    // Verify the rental appears in the list
    await expect(page.locator('text=Smoke Test Customer')).toBeVisible();
    
    // Test filters
    await page.selectOption('select[name="status"]', 'active');
    await page.fill('input[name="date_from"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="date_to"]', endDate.toISOString().split('T')[0]);
    
    // ===== CALENDAR VIEW =====
    await page.goto('/calendar');
    await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 10000 });
    
    // Should see the rental event
    await expect(page.locator('.rbc-event')).toBeVisible({ timeout: 10000 });
    
    // Click event to open detail
    await page.click('.rbc-event:first-child');
    await expect(page.locator('[data-testid="modal-panel"]')).toBeVisible();
    await expect(page.locator('text=Smoke Test Customer')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="modal-close"]');
    
    // ===== NOTIFICATIONS =====
    await page.click('[data-testid="notification-bell"]');
    await expect(page.locator('text=Notifikasi')).toBeVisible();
    
    // Go to notifications page
    await page.goto('/notifications');
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible({ timeout: 10000 });
    
    // ===== LOGOUT =====
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
  });

  test('should handle rental overlap validation', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'adminpass123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Create first rental
    await page.goto('/rentals/create');
    await page.fill('input[name="customer_name"]', 'Overlap Test 1');
    await page.fill('input[name="customer_phone"]', '081234567890');
    await page.fill('input[name="customer_email"]', 'overlap1@test.com');
    await page.click('button:has-text("Next")');
    await page.click('[data-testid="computer-option-0"]');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 5);
    
    await page.fill('input[name="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="end_date"]', endDate.toISOString().split('T')[0]);
    await page.fill('input[name="deposit"]', '50000');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=Rental created successfully')).toBeVisible({ timeout: 10000 });
    
    // Try to create overlapping rental with same computer
    await page.goto('/rentals/create');
    await page.fill('input[name="customer_name"]', 'Overlap Test 2');
    await page.fill('input[name="customer_phone"]', '081234567891');
    await page.fill('input[name="customer_email"]', 'overlap2@test.com');
    await page.click('button:has-text("Next")');
    await page.click('[data-testid="computer-option-0"]');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // Same date range
    await page.fill('input[name="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="end_date"]', endDate.toISOString().split('T')[0]);
    await page.fill('input[name="deposit"]', '50000');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Submit")');
    
    // Should show conflict error
    await expect(page.locator('text=conflict')).toBeVisible({ timeout: 5000 });
  });
});