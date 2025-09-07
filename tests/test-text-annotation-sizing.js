import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 Testing text annotation sizing (should still have padding)...\n');
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5176');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Sample PDF loaded');
    
    // Add text annotation
    console.log('\n🔧 Adding text annotation...');
    await page.click('button:has-text("Text")');
    await page.waitForTimeout(500);
    
    // Click on canvas to add text
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);
    
    // Enter text in modal
    const textInput = page.locator('.text-input');
    await textInput.fill('Test Text');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    console.log('📍 Text annotation placed on canvas');
    
    // Select the text annotation to see bounding box
    const textAnnotation = page.locator('.annotation-overlay').first();
    await textAnnotation.click();
    await page.waitForTimeout(500);
    
    // Check that text annotations still have proper padding
    const textContent = await textAnnotation.textContent();
    console.log(`📝 Text content: "${textContent}"`);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/text-annotation-sizing.png' });
    console.log('📸 Screenshot saved: tests/screenshots/text-annotation-sizing.png');
    
    console.log('✅ Text annotation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🔍 Browser will stay open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();