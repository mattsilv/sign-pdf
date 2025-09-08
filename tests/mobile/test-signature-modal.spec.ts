import { test, expect, devices } from '@playwright/test';

// Test on multiple mobile devices
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
];

mobileDevices.forEach(({ name, device }) => {
  test.describe(`Signature Modal on ${name}`, () => {
    test.use(device);

    test('should display full-screen modal on mobile', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Upload a test PDF first
      await page.click('text="Try with Sample NDA Document"');
      
      // Wait for PDF to load
      await page.waitForSelector('.pdf-container', { timeout: 10000 });
      
      // Click signature tool
      await page.click('.tool-button:has-text("Sign")');
      
      // Check modal is visible and takes most of screen
      const modal = page.locator('.signature-modal');
      await expect(modal).toBeVisible();
      
      // Check modal has mobile-specific styles
      const modalBox = await modal.boundingBox();
      const viewport = page.viewportSize();
      
      if (modalBox && viewport) {
        // Modal should take full width on mobile
        expect(modalBox.width).toBeCloseTo(viewport.width, 10);
        
        // Modal should take ~85% of height on mobile
        const expectedHeight = viewport.height * 0.85;
        expect(modalBox.height).toBeGreaterThan(expectedHeight * 0.9);
        expect(modalBox.height).toBeLessThan(viewport.height);
      }
    });

    test('should have touch-friendly buttons', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Upload PDF
      await page.click('text="Try with Sample NDA Document"');
      await page.waitForSelector('.pdf-container');
      
      // Open signature modal
      await page.click('.tool-button:has-text("Sign")');
      
      // Check button sizes (should be at least 44px for touch targets)
      const saveButton = page.locator('.save-button');
      const saveBox = await saveButton.boundingBox();
      
      if (saveBox) {
        expect(saveBox.height).toBeGreaterThanOrEqual(44);
      }
      
      // Check close button size
      const closeButton = page.locator('.close-button');
      const closeBox = await closeButton.boundingBox();
      
      if (closeBox) {
        expect(closeBox.width).toBeGreaterThanOrEqual(44);
        expect(closeBox.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should support drawing with touch', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Upload PDF
      await page.click('text="Try with Sample NDA Document"');
      await page.waitForSelector('.pdf-container');
      
      // Open signature modal
      await page.click('.tool-button:has-text("Sign")');
      
      // Get canvas element
      const canvas = page.locator('.signature-canvas');
      await expect(canvas).toBeVisible();
      
      // Simulate touch drawing
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        const centerX = canvasBox.x + canvasBox.width / 2;
        const centerY = canvasBox.y + canvasBox.height / 2;
        
        // Simulate finger drawing a simple line
        await page.touchscreen.tap(centerX - 50, centerY);
        await page.waitForTimeout(100);
        
        for (let i = -50; i <= 50; i += 10) {
          await page.touchscreen.tap(centerX + i, centerY);
          await page.waitForTimeout(20);
        }
      }
      
      // Save button should be enabled after drawing
      const saveButton = page.locator('.save-button');
      await expect(saveButton).not.toBeDisabled();
    });

    test('should support typing signature', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Upload PDF
      await page.click('text="Try with Sample NDA Document"');
      await page.waitForSelector('.pdf-container');
      
      // Open signature modal
      await page.click('.tool-button:has-text("Sign")');
      
      // Switch to type mode
      await page.click('.mode-option:has-text("Type Signature")');
      
      // Type a signature
      const textInput = page.locator('.signature-text-input');
      await expect(textInput).toBeVisible();
      await textInput.fill('John Doe');
      
      // Save button should be enabled
      const saveButton = page.locator('.save-button');
      await expect(saveButton).not.toBeDisabled();
      
      // Save the signature
      await saveButton.click();
      
      // Modal should close
      await expect(page.locator('.signature-modal')).not.toBeVisible();
    });

    test('should show mobile-specific hint text', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Upload PDF
      await page.click('text="Try with Sample NDA Document"');
      await page.waitForSelector('.pdf-container');
      
      // Open signature modal
      await page.click('.tool-button:has-text("Sign")');
      
      // Check for mobile hint
      const hint = page.locator('.signature-hint');
      await expect(hint).toContainText('Draw your signature with your finger');
    });
  });
});

// Also test desktop for comparison
test.describe('Signature Modal on Desktop', () => {
  test.use({
    viewport: { width: 1280, height: 720 }
  });

  test('should display centered modal on desktop', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('coordinate_test.pdf');
    await page.waitForSelector('.pdf-container');
    
    // Open signature modal
    await page.click('.tool-button:has-text("Sign")');
    
    const modal = page.locator('.signature-modal');
    await expect(modal).toBeVisible();
    
    // Check modal size on desktop
    const modalBox = await modal.boundingBox();
    if (modalBox) {
      // Should be max 500px wide
      expect(modalBox.width).toBeLessThanOrEqual(500);
      // Should not take full viewport height
      expect(modalBox.height).toBeLessThan(720 * 0.8);
    }
    
    // Check for desktop hint
    const hint = page.locator('.signature-hint');
    if (await hint.isVisible()) {
      await expect(hint).toContainText('Draw your signature above');
    }
  });
});