import { test, expect } from '@playwright/test';

test.describe('Rental CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'adminpass123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create a rental with computer', async ({ page }) => {
    // Navigate to create rental
    await page.goto('/rentals/create');
    
    // Wait for form to load
    await expect(page.locator('text=Create Rental')).toBeVisible({ timeout: 10000 });
    
    // Step 1: Customer info
    await page.fill('input[name="customer_name"]', 'Test Customer');
    await page.fill('input[name="customer_phone"]', '081234567890');
    await page.fill('input[name="customer_email"]', 'customer@test.com');
    await page.click('button:has-text("Next")');
    
    // Step 2: Select computer
    await expect(page.locator('text=Select Computer')).toBeVisible();
    await page.click('[data-testid="computer-option-0"]'); // First available computer
    await page.click('button:has-text("Next")');
    
    // Step 3: Select components (optional, skip for now)
    await page.click('button:has-text("Next")');
    
    // Step 4: Duration
    await expect(page.locator('text=Rental Duration')).toBeVisible();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 5);
    
    await page.fill('input[name="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="end_date"]', endDate.toISOString().split('T')[0]);
    await page.fill('input[name="deposit"]', '50000');
    await page.click('button:has-text("Next")');
    
    // Step 5: Summary
    await expect(page.locator('text=Summary')).toBeVisible();
    await page.click('button:has-text("Submit")');
    
    // Should show success and redirect to list
    await expect(page.locator('text=Rental created successfully')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*rentals/);
  });

  test('should list rentals with filters', async ({ page }) => {
    await page.goto('/rentals');
    
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible({ timeout: 10000 });
    
    // Filter by status
    await page.selectOption('select[name="status"]', 'active');
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible();
    
    // Filter by date range
    await page.fill('input[name="date_from"]', '2024-01-01');
    await page.fill('input[name="date_to"]', '2024-12-31');
  });

  test('should view rental detail', async ({ page }) => {
    await page.goto('/rentals');
    
    // Click on first rental row
    await page.click('[data-testid="table-body"] tr:first-child');
    
    // Should open detail modal
    await expect(page.locator('[data-testid="modal-panel"]')).toBeVisible();
    await expect(page.locator('text=Rental Detail')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="modal-close"]');
    await expect(page.locator('[data-testid="modal-panel"]')).not.toBeVisible();
  });

  test('should start rental', async ({ page }) => {
    await page.goto('/rentals');
    
    // Find a pending rental and start it
    await page.click('[data-testid="table-body"] tr:has-text("pending") button:has-text("Start")');
    
    // Confirm
    await page.click('button:has-text("Confirm")');
    
    // Should show success
    await expect(page.locator('text=Rental started')).toBeVisible({ timeout: 5000 });
  });

  test('should complete rental', async ({ page }) => {
    await page.goto('/rentals');
    
    // Find an active rental and complete it
    await page.click('[data-testid="table-body"] tr:has-text("active") button:has-text("Complete")');
    
    // Confirm
    await page.click('button:has-text("Confirm")');
    
    // Should show success
    await expect(page.locator('text=Rental completed')).toBeVisible({ timeout: 5000 });
  });

  test('should export rentals to CSV', async ({ page }) => {
    await page.goto('/rentals');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export CSV")');
    const download = await downloadPromise;
    
    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/rentals.*\.csv/);
  });
});