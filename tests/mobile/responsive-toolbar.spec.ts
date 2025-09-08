import { test, expect } from '@playwright/test';

test.describe('Responsive Toolbar', () => {
  test.describe('Desktop View', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('shows all tools in desktop toolbar', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF to show the toolbar
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      
      // Wait for PDF to load
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Check that desktop toolbar is visible
      const desktopToolbar = page.locator('.desktop-toolbar');
      await expect(desktopToolbar).toBeVisible();
      
      // Check that mobile toolbar is not visible
      const mobileToolbar = page.locator('.mobile-toolbar');
      await expect(mobileToolbar).not.toBeVisible();
    });
  });

  test.describe('Mobile View', () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true });

    test('shows mobile toolbar with primary actions', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF to show the toolbar
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      
      // Wait for PDF to load
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Check that mobile toolbar is visible
      const mobileToolbar = page.locator('.mobile-toolbar');
      await expect(mobileToolbar).toBeVisible();
      
      // Check that desktop toolbar is not visible
      const desktopToolbar = page.locator('.desktop-toolbar');
      await expect(desktopToolbar).not.toBeVisible();
      
      // Check for more button
      const moreButton = page.locator('.more-button');
      await expect(moreButton).toBeVisible();
    });

    test('opens bottom sheet when more button is clicked', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Click more button
      const moreButton = page.locator('.more-button');
      await moreButton.click();
      
      // Check that bottom sheet is visible
      const bottomSheet = page.locator('.bottom-sheet');
      await expect(bottomSheet).toBeVisible();
      
      // Check for handle
      const handle = page.locator('.bottom-sheet-handle');
      await expect(handle).toBeVisible();
      
      // Check for tools in bottom sheet
      const bottomSheetTools = page.locator('.bottom-sheet-tool');
      expect(await bottomSheetTools.count()).toBeGreaterThan(0);
    });

    test('closes bottom sheet when backdrop is clicked', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Open bottom sheet
      const moreButton = page.locator('.more-button');
      await moreButton.click();
      
      // Verify it's open
      const bottomSheet = page.locator('.bottom-sheet');
      await expect(bottomSheet).toBeVisible();
      
      // Click backdrop
      const backdrop = page.locator('.bottom-sheet-backdrop');
      await backdrop.click({ position: { x: 10, y: 10 } });
      
      // Verify it's closed
      await expect(bottomSheet).not.toBeVisible();
    });

    test('supports drag gestures on bottom sheet', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Open bottom sheet
      const moreButton = page.locator('.more-button');
      await moreButton.click();
      
      // Get handle for dragging
      const handle = page.locator('.bottom-sheet-handle-container');
      await expect(handle).toBeVisible();
      
      // Simulate drag down (should close)
      await handle.hover();
      await page.mouse.down();
      await page.mouse.move(0, 200, { steps: 10 });
      await page.mouse.up();
      
      // Check that bottom sheet closed
      const bottomSheet = page.locator('.bottom-sheet');
      await expect(bottomSheet).not.toBeVisible();
    });
  });

  test.describe('Tablet View', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('shows appropriate toolbar for tablet size', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Check which toolbar is visible (depends on exact breakpoint)
      const toolbarExists = await page.locator('.desktop-toolbar, .mobile-toolbar').isVisible();
      expect(toolbarExists).toBe(true);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('toolbar adapts when window is resized', async ({ page }) => {
      // Start with desktop size
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      
      // Upload a PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./coordinate_test.pdf');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Check desktop toolbar is visible
      const desktopToolbar = page.locator('.desktop-toolbar');
      await expect(desktopToolbar).toBeVisible();
      
      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500); // Wait for resize to process
      
      // Check mobile toolbar is visible
      const mobileToolbar = page.locator('.mobile-toolbar');
      await expect(mobileToolbar).toBeVisible();
      
      // Desktop toolbar should be hidden
      await expect(desktopToolbar).not.toBeVisible();
      
      // Resize back to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);
      
      // Check desktop toolbar is visible again
      await expect(desktopToolbar).toBeVisible();
      await expect(mobileToolbar).not.toBeVisible();
    });
  });
});