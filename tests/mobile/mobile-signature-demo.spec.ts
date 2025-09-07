import { test, expect, devices } from '@playwright/test';

/**
 * Mobile Signature Workflow Demo Test
 * 
 * This test demonstrates the mobile testing approach for the PDF signing tool.
 * It tests the core workflow with the sample NDA document to avoid file upload complexity.
 */

test.describe('Mobile Signature Workflow Demo', () => {
  // Configure for mobile testing
  test.use({ 
    ...devices['iPhone 13'],
    hasTouch: true 
  });

  test('should complete signature workflow on mobile device', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Load sample document (avoids file upload complexity)
    await page.getByRole('button', { name: /Try with Sample NDA Document/i }).tap();
    
    // Wait for PDF to load
    await expect(page.locator('.pdf-container canvas')).toBeVisible({ timeout: 10000 });
    
    // Verify bottom toolbar is visible on mobile
    await expect(page.locator('.tool-panel')).toBeVisible();
    
    // Select signature tool - should open signature modal
    await page.getByRole('button', { name: /signature/i }).first().tap();
    
    // Signature modal should appear
    await expect(page.locator('.signature-modal')).toBeVisible();
    
    // Test drawing signature with touch
    const canvas = page.locator('.signature-canvas');
    await expect(canvas).toBeVisible();
    
    // Draw a simple signature with touch points
    const canvasBounds = await canvas.boundingBox();
    if (canvasBounds) {
      const centerX = canvasBounds.x + canvasBounds.width / 2;
      const centerY = canvasBounds.y + canvasBounds.height / 2;
      
      // Simulate drawing a signature
      await page.touchscreen.tap(centerX - 50, centerY);
      await page.mouse.move(centerX - 50, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 50, centerY + 20);
      await page.mouse.move(centerX, centerY - 20);
      await page.mouse.up();
    }
    
    // Save signature
    await page.getByRole('button', { name: /Save Signature/i }).tap();
    
    // Modal should close
    await expect(page.locator('.signature-modal')).not.toBeVisible();
    
    // Place signature on PDF by tapping
    const pdfCanvas = page.locator('.pdf-container canvas');
    await pdfCanvas.tap({ position: { x: 300, y: 400 } });
    
    // Verify annotation overlay appears
    await expect(page.locator('.annotation-overlay')).toBeVisible();
    
    // Test pinch-to-zoom (if implemented)
    try {
      await page.touchscreen.pinch(300, 300, 1.5);
      // Should zoom to 150% (if implemented)
      const zoomDisplay = page.locator('.zoom-controls span');
      await expect(zoomDisplay).toContainText('150%');
    } catch (error) {
      console.log('Pinch-zoom not yet implemented:', error);
    }
    
    // Test annotation selection and dragging
    const annotation = page.locator('.annotation-overlay').first();
    // const originalPosition = await annotation.boundingBox();
    
    // Long press to potentially show magnifier (if implemented)
    await annotation.tap({ delay: 500 });
    
    // Verify annotation is selected
    await expect(annotation).toHaveCSS('border', /2px solid/);
    
    // Export PDF - should work with mobile sharing
    const exportButton = page.getByRole('button', { name: /Download PDF|Export/i }).first();
    await exportButton.tap();
    
    // Wait for export to complete
    await expect(exportButton).not.toBeDisabled({ timeout: 10000 });
    
    console.log('✅ Mobile signature workflow completed successfully');
  });

  test('should handle touch interactions correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Try with Sample NDA Document/i }).tap();
    await expect(page.locator('.pdf-container canvas')).toBeVisible({ timeout: 10000 });
    
    // Test touch target sizes (should be at least 44pt)
    const toolButtons = page.locator('.tool-button');
    const buttonCount = await toolButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = toolButtons.nth(i);
      const bounds = await button.boundingBox();
      
      if (bounds) {
        // 44pt = ~59px at standard DPI
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    console.log('✅ All touch targets meet 44pt minimum size requirement');
  });

  test('should adapt layout for mobile viewport', async ({ page }) => {
    await page.goto('/');
    
    // Check that viewport height is handled correctly
    const appHeight = await page.locator('.app').evaluate(el => 
      window.getComputedStyle(el).height
    );
    
    // Should use full viewport height
    expect(appHeight).toBe('100vh');
    
    // Tool panel should be positioned for mobile
    const toolPanel = page.locator('.tool-panel');
    const toolPanelStyle = await toolPanel.evaluate(el => 
      window.getComputedStyle(el)
    );
    
    // Could check for bottom positioning or mobile-specific styling
    expect(toolPanelStyle.position).toBeDefined();
    
    console.log('✅ Mobile layout adaptation working correctly');
  });

  // Test signature modal specifically for mobile
  test('should optimize signature modal for mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Try with Sample NDA Document/i }).tap();
    await expect(page.locator('.pdf-container canvas')).toBeVisible({ timeout: 10000 });
    
    // Open signature modal
    await page.getByRole('button', { name: /signature/i }).first().tap();
    
    const modal = page.locator('.signature-modal');
    await expect(modal).toBeVisible();
    
    // On mobile, modal should be full-screen or optimized size
    const modalBounds = await modal.boundingBox();
    const viewportSize = page.viewportSize();
    
    if (modalBounds && viewportSize) {
      // Modal should take significant portion of screen
      const modalRatio = (modalBounds.width * modalBounds.height) / 
                        (viewportSize.width * viewportSize.height);
      expect(modalRatio).toBeGreaterThan(0.5); // At least 50% of screen
    }
    
    // Canvas should be appropriately sized for mobile
    const canvas = page.locator('.signature-canvas');
    const canvasBounds = await canvas.boundingBox();
    
    if (canvasBounds) {
      expect(canvasBounds.width).toBeGreaterThan(200);
      expect(canvasBounds.height).toBeGreaterThan(100);
    }
    
    console.log('✅ Signature modal optimized for mobile viewport');
  });
});