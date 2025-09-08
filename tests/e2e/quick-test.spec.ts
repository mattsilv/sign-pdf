import { test } from '@playwright/test';

test('Quick sample button test', async ({ page }) => {
  await page.goto('/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Debug: Log all button elements
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} buttons`);
  
  // Try different selectors
  const selectors = [
    'button:has-text("Sample")',
    'button:has-text("NDA")',
    'button.sample-document-link',
    'button:has-text("Try")',
    'text=/.*Sample.*/i',
    'button >> text=/.*Sample.*/i',
    '.sample-document-link',
    '[class*="sample"]'
  ];
  
  for (const selector of selectors) {
    try {
      const element = page.locator(selector);
      const count = await element.count();
      const isVisible = count > 0 ? await element.first().isVisible() : false;
      console.log(`Selector "${selector}": found ${count}, visible: ${isVisible}`);
    } catch (e) {
      console.log(`Selector "${selector}": error - ${e.message}`);
    }
  }
  
  // Try to get all text content
  const textContent = await page.textContent('body');
  const hasNDAText = textContent?.includes('NDA');
  const hasSampleText = textContent?.includes('Sample');
  console.log(`Page contains "NDA": ${hasNDAText}, "Sample": ${hasSampleText}`);
  
  // Log the actual HTML of the upload container
  const uploadContainer = await page.locator('.file-upload-container').innerHTML().catch(() => 'Not found');
  console.log('Upload container HTML:', uploadContainer);
});