import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to app
  await page.goto('http://localhost:5176');
  
  // Load sample PDF
  await page.click('button:has-text("Try with Sample NDA")');
  
  // Wait for canvas to load
  await page.waitForSelector('canvas', { timeout: 10000 });
  
  // Add text annotation
  await page.click('button:has-text("Text")');
  await page.locator('canvas').click({ position: { x: 200, y: 300 } });
  
  // Wait and fill text
  await page.waitForTimeout(1000);
  const textInput = await page.locator('input[type="text"]');
  if (await textInput.isVisible()) {
    await textInput.fill('Test Annotation #1');
    await page.click('button:has-text("Add Text")');
  }
  
  // Add checkmark
  await page.click('button:has-text("Checkmark")');
  await page.locator('canvas').click({ position: { x: 300, y: 400 } });
  
  // Add date
  await page.click('button:has-text("Date")');
  await page.locator('canvas').click({ position: { x: 400, y: 500 } });
  
  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/annotations-with-numbers.png' });
  
  // Test delete on hover
  const firstAnnotation = await page.locator('.annotation-overlay').first();
  await firstAnnotation.hover();
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'tests/screenshots/annotation-delete-hover.png' });
  
  console.log('Screenshots saved!');
  console.log('Check:');
  console.log('  - tests/screenshots/annotations-with-numbers.png');
  console.log('  - tests/screenshots/annotation-delete-hover.png');
  
  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();