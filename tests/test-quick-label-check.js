import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 Quick label positioning test...\n');
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5176');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Sample PDF loaded');
    
    // Add a signature annotation
    console.log('\n🔧 Adding signature annotation...');
    await page.click('button:has-text("Signature")');
    await page.waitForTimeout(500);
    
    // Switch to type mode for consistent sizing
    await page.click('span:has-text("⌨️ Type Signature")');
    await page.waitForTimeout(500);
    
    // Type signature text
    const signatureInput = page.locator('.signature-text-input');
    await signatureInput.fill('John Doe');
    await signatureInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Place signature on canvas
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 300, y: 200 } });
    console.log('📍 Signature placed on canvas');
    
    // Take screenshot to verify label positioning
    await page.screenshot({ path: 'tests/screenshots/quick-label-check.png' });
    console.log('📸 Screenshot saved: tests/screenshots/quick-label-check.png');
    
    console.log('\n✅ Quick test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Keep browser open for 3 seconds
  console.log('\n🔍 Browser will stay open for 3 seconds...');
  await page.waitForTimeout(3000);
  
  await browser.close();
})();