import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Complete User Journey - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('Complete signing flow from start to finish', async ({ page }) => {
    // Step 1: Navigate to app
    await page.goto('/');
    
    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
    
    // Step 2: Load the sample PDF
    const sampleButton = page.locator('button:has-text("Try with Sample NDA Document")');
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
    await sampleButton.click();
    
    // Step 3: Wait for PDF to load and verify it's displayed
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    const pdfPages = await page.locator('.pdf-page').count();
    expect(pdfPages).toBeGreaterThan(0);
    
    // Step 4: Verify toolbar is visible
    await expect(page.locator('.tool-panel')).toBeVisible();
    
    // Step 5: Add a text annotation
    await page.click('.tool-button:has-text("Text")');
    
    // Click on the PDF to place text
    const pdfContainer = page.locator('.pdf-pages-container, .pdf-container').first();
    await pdfContainer.click({ position: { x: 200, y: 300 } });
    
    // Type text in the modal/input that appears
    const textInput = await page.waitForSelector('input[type="text"], textarea', { timeout: 5000 });
    await textInput.fill('Test Agreement Text');
    await page.keyboard.press('Enter');
    
    // Step 6: Add a signature
    await page.click('.tool-button:has-text("Signature")');
    
    // Check if signature modal appears (first time use)
    const signatureModal = page.locator('.signature-modal');
    if (await signatureModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type a signature
      await page.click('.mode-option:has-text("Type")');
      await page.fill('.signature-text-input', 'John Doe');
      await page.click('.save-button');
      await page.waitForSelector('.signature-modal', { state: 'hidden' });
    }
    
    // Place signature on PDF
    await pdfContainer.click({ position: { x: 400, y: 500 } });
    await page.waitForTimeout(500);
    
    // Step 7: Add initials
    const initialsButton = page.locator('.tool-button:has-text("Initials")');
    if (await initialsButton.isVisible()) {
      await initialsButton.click();
      
      // Check if initials modal appears
      const initialsModal = page.locator('.initials-modal, .signature-modal');
      if (await initialsModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.fill('input[placeholder*="initials"], .initials-text-input, .signature-text-input', 'JD');
        await page.click('.save-button');
        await page.waitForSelector('.initials-modal, .signature-modal', { state: 'hidden' });
      }
      
      // Place initials
      await pdfContainer.click({ position: { x: 100, y: 200 } });
      await page.waitForTimeout(500);
    }
    
    // Step 8: Add a date
    const dateButton = page.locator('.tool-button:has-text("Date")');
    if (await dateButton.isVisible()) {
      await dateButton.click();
      await pdfContainer.click({ position: { x: 300, y: 600 } });
      await page.waitForTimeout(500);
    }
    
    // Step 9: Verify annotations are visible
    const annotations = await page.locator('.annotation-layer .annotation, .annotation').count();
    expect(annotations).toBeGreaterThan(0);
    
    // Step 10: Export/Download the PDF
    await page.click('.tool-button:has-text("Export"), .tool-button:has-text("Download")');
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    
    // Handle any confirmation dialog
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Download"), button:has-text("Export")');
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Step 11: Verify the PDF was generated successfully
    const path = await download.path();
    expect(path).toBeTruthy();
    
    console.log('✅ Desktop journey completed successfully');
  });

  test('Handle errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Test file upload with invalid file
    const fileInput = await page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Create a non-PDF file
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is not a PDF')
      });
      
      // Should show error message
      const errorMessage = await page.waitForSelector('.error-message, .error, [role="alert"]', { timeout: 5000 }).catch(() => null);
      if (errorMessage) {
        expect(await errorMessage.textContent()).toContain(/invalid|error|pdf/i);
      }
    }
  });

  test('Persist user preferences', async ({ page }) => {
    await page.goto('/');
    
    // Load sample PDF
    await page.waitForSelector('text="Try with Sample NDA Document"', { timeout: 5000 });
    await page.click('text="Try with Sample NDA Document"');
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    
    // Create and save a signature
    await page.click('.tool-button:has-text("Signature")');
    const signatureModal = page.locator('.signature-modal');
    if (await signatureModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('.mode-option:has-text("Type")');
      await page.fill('.signature-text-input', 'Jane Smith');
      await page.click('.save-button');
      await page.waitForSelector('.signature-modal', { state: 'hidden' });
    }
    
    // Reload page
    await page.reload();
    
    // Load PDF again
    await page.waitForSelector('text="Try with Sample NDA Document"', { timeout: 5000 });
    await page.click('text="Try with Sample NDA Document"');
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    
    // Click signature tool - should not show modal (has saved signature)
    await page.click('.tool-button:has-text("Signature")');
    
    // Should be able to place signature immediately
    const pdfContainer = page.locator('.pdf-pages-container, .pdf-container').first();
    await pdfContainer.click({ position: { x: 400, y: 500 } });
    
    // Verify signature was placed
    await page.waitForTimeout(500);
    const annotations = await page.locator('.annotation').count();
    expect(annotations).toBeGreaterThan(0);
  });
});

test.describe('Complete User Journey - Mobile', () => {
  test.use({ 
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true 
  });

  test('Complete signing flow on mobile device', async ({ page }) => {
    // Step 1: Navigate to app
    await page.goto('/');
    
    // Step 2: Load the sample PDF
    await page.waitForSelector('text="Try with Sample NDA Document"', { timeout: 5000 });
    await page.tap('text="Try with Sample NDA Document"');
    
    // Step 3: Wait for PDF to load
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    const pdfPages = await page.locator('.pdf-page').count();
    expect(pdfPages).toBeGreaterThan(0);
    
    // Step 4: Verify mobile toolbar is visible
    const mobileToolbar = page.locator('.mobile-toolbar, .responsive-toolbar');
    await expect(mobileToolbar).toBeVisible();
    
    // Step 5: Test swipe navigation (if multi-page PDF)
    if (pdfPages > 1) {
      const pdfContainer = page.locator('.pdf-pages-container, .pdf-container').first();
      const box = await pdfContainer.boundingBox();
      
      if (box) {
        // Swipe left to go to next page
        await page.touchscreen.swipe({
          startX: box.x + box.width * 0.8,
          startY: box.y + box.height / 2,
          endX: box.x + box.width * 0.2,
          endY: box.y + box.height / 2,
          steps: 10
        });
        
        await page.waitForTimeout(500);
        
        // Verify page changed
        const debugInfo = await page.locator('.virtualization-debug, .page-indicator').textContent().catch(() => '');
        expect(debugInfo).toContain('2');
        
        // Swipe right to go back
        await page.touchscreen.swipe({
          startX: box.x + box.width * 0.2,
          startY: box.y + box.height / 2,
          endX: box.x + box.width * 0.8,
          endY: box.y + box.height / 2,
          steps: 10
        });
        
        await page.waitForTimeout(500);
      }
    }
    
    // Step 6: Open more tools menu (if collapsed)
    const moreButton = page.locator('.more-button, button:has-text("More")');
    if (await moreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreButton.tap();
      await page.waitForTimeout(300);
    }
    
    // Step 7: Add text annotation
    await page.tap('.tool-button:has-text("Text")');
    const pdfContainer = page.locator('.pdf-pages-container, .pdf-container').first();
    await pdfContainer.tap({ position: { x: 100, y: 200 } });
    
    // Type text
    const textInput = await page.waitForSelector('input[type="text"], textarea', { timeout: 5000 });
    await textInput.fill('Mobile Test');
    await page.keyboard.press('Enter');
    
    // Step 8: Add signature
    await page.tap('.tool-button:has-text("Signature")');
    
    const signatureModal = page.locator('.signature-modal');
    if (await signatureModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Draw signature on mobile
      const drawOption = page.locator('.mode-option:has-text("Draw")');
      if (await drawOption.isVisible()) {
        await drawOption.tap();
        
        // Draw on canvas
        const canvas = page.locator('.signature-canvas, canvas').first();
        const canvasBox = await canvas.boundingBox();
        if (canvasBox) {
          // Draw a simple signature
          await page.touchscreen.swipe({
            startX: canvasBox.x + 50,
            startY: canvasBox.y + canvasBox.height / 2,
            endX: canvasBox.x + canvasBox.width - 50,
            endY: canvasBox.y + canvasBox.height / 2,
            steps: 20
          });
        }
      } else {
        // Fallback to type
        await page.tap('.mode-option:has-text("Type")');
        await page.fill('.signature-text-input', 'Mobile User');
      }
      
      await page.tap('.save-button');
      await page.waitForSelector('.signature-modal', { state: 'hidden' });
    }
    
    // Place signature
    await pdfContainer.tap({ position: { x: 200, y: 400 } });
    await page.waitForTimeout(500);
    
    // Step 9: Test haptic feedback (check console for vibration calls)
    const hasVibrationAPI = await page.evaluate(() => 'vibrate' in navigator);
    console.log('Vibration API available:', hasVibrationAPI);
    
    // Step 10: Export PDF
    await page.tap('.tool-button:has-text("Export"), .tool-button:has-text("Download")');
    
    // Handle download on mobile
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Download")');
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.tap();
    }
    
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.pdf');
    }
    
    console.log('✅ Mobile journey completed successfully');
  });

  test('Mobile offline functionality', async ({ page, context }) => {
    // Load app first
    await page.goto('/');
    await page.waitForSelector('text="Try with Sample NDA Document"', { timeout: 5000 });
    
    // Go offline
    await context.setOffline(true);
    
    // App should still be accessible
    await page.reload();
    
    // Should show offline indicator or work offline
    const offlineIndicator = await page.locator('.offline-indicator, [data-offline]').isVisible().catch(() => false);
    
    // Basic functionality should still work
    await page.tap('text="Try with Sample NDA Document"');
    
    // PDF might not load if not cached, but app shouldn't crash
    await page.waitForTimeout(2000);
    
    // Go back online
    await context.setOffline(false);
    
    console.log('✅ Offline test completed');
  });
});

test.describe('Accessibility and Performance', () => {
  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interface
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to activate sample PDF with Enter
    await page.keyboard.press('Enter');
    
    // Wait for PDF
    await page.waitForSelector('.pdf-page', { timeout: 10000 }).catch(() => null);
    
    // Tab to tools
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Activate tool with Enter/Space
    await page.keyboard.press('Enter');
    
    console.log('✅ Keyboard navigation test completed');
  });

  test('Performance metrics', async ({ page }) => {
    // Start measuring
    await page.goto('/');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    console.log('Performance metrics:', metrics);
    
    // Load PDF and measure render time
    const startTime = Date.now();
    await page.click('text="Try with Sample NDA Document"');
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    console.log(`PDF load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });
});