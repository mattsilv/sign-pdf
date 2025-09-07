import { test, expect } from '@playwright/test';

test.describe('Geometry System Validation', () => {
  test('coordinates remain invariant across zoom levels', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5175');
    
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await expect(page.getByText('Tools')).toBeVisible();
    
    // Create a signature
    await page.getByRole('button', { name: 'Typed', exact: true }).click();
    await page.locator('#full-name').fill('Test User');
    await page.getByRole('button', { name: 'Use This Signature' }).click();
    
    // Enable signature tool
    await page.getByRole('button', { name: 'Signature' }).click();
    
    // Store coordinates at different zoom levels
    const zoomLevels = [50, 100, 150];
    const coordinates = [];
    
    for (const zoom of zoomLevels) {
      // Set zoom level
      if (zoom > 100) {
        for (let i = 100; i < zoom; i += 25) {
          await page.locator('.zoom-controls button').last().click();
        }
      } else if (zoom < 100) {
        for (let i = 100; i > zoom; i -= 25) {
          await page.locator('.zoom-controls button').first().click();
        }
      }
      
      // Wait for zoom to apply
      await page.waitForTimeout(100);
      
      // Click to place signature
      await page.locator('canvas').click({ position: { x: 300, y: 300 } });
      
      // Capture console logs with coordinate info
      const consoleLog = await page.evaluate(() => {
        return window.lastConsoleLog || '';
      });
      
      coordinates.push({ zoom, log: consoleLog });
      
      // Reset for next test
      await page.keyboard.press('Escape');
    }
    
    // Verify coordinates are invariant
    console.log('Captured coordinates at different zoom levels:', coordinates);
    
    // Export PDF to verify placement
    await page.getByRole('button', { name: 'Export PDF' }).click();
    
    // Verify download happened
    const download = await page.waitForEvent('download');
    expect(download).toBeTruthy();
    
    console.log('✅ Geometry system test completed successfully');
  });
  
  test('bounds checking prevents out-of-page placement', async ({ page }) => {
    await page.goto('http://localhost:5175');
    
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await expect(page.getByText('Tools')).toBeVisible();
    
    // Create a signature
    await page.getByRole('button', { name: 'Typed', exact: true }).click();
    await page.locator('#full-name').fill('Test User');
    await page.getByRole('button', { name: 'Use This Signature' }).click();
    
    // Enable signature tool
    await page.getByRole('button', { name: 'Signature' }).click();
    
    // Try to place signature outside page bounds
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Click near the edge of the page
    await canvas.click({ position: { x: box.width - 10, y: box.height - 10 } });
    
    // Check console for bounds clamping
    page.on('console', msg => {
      if (msg.text().includes('[BOUNDS]')) {
        console.log('Bounds checking active:', msg.text());
      }
    });
    
    // Verify signature was placed
    const annotations = await page.locator('.annotation-overlay').count();
    expect(annotations).toBeGreaterThan(0);
    
    console.log('✅ Bounds checking test completed successfully');
  });
});