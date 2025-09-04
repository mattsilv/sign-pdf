import { chromium } from '@playwright/test';

(async () => {
  // Use persistent context to maintain localStorage between runs
  const userDataDir = './.playwright-data';
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200
  });
  const page = await browser.newPage();
  
  console.log('=== Complete Signature Flow Test ===\n');
  
  console.log('1. Navigate to app');
  await page.goto('http://localhost:5174/');
  
  console.log('2. Load sample PDF');
  await page.click('text=Try with Sample NDA Document');
  await page.waitForSelector('.tool-panel', { timeout: 5000 });
  
  console.log('3. Check if signature already exists');
  const hasEditButton = await page.isVisible('button:has-text("Edit Signature")');
  
  if (hasEditButton) {
    console.log('✓ Signature already saved from previous session');
    
    console.log('4. Click signature tool (should NOT open modal)');
    await page.click('.tool-button:has-text("Signature")');
    await page.waitForTimeout(500);
    
    const modalVisible = await page.isVisible('.signature-modal');
    if (modalVisible) {
      console.log('❌ BUG: Modal opened when signature exists!');
    } else {
      console.log('✓ Modal correctly skipped');
    }
    
    console.log('5. Click on PDF to place signature');
    const canvas = await page.$('.pdf-container canvas');
    if (canvas) {
      await canvas.click({ position: { x: 400, y: 500 } });
      await page.waitForTimeout(500);
      
      const hasAnnotation = await page.isVisible('.annotations-panel');
      if (hasAnnotation) {
        console.log('✓ Signature placed successfully');
        
        // Take screenshot
        await page.screenshot({ 
          path: '.playwright-mcp/complete-test.png',
          fullPage: true 
        });
        console.log('✓ Screenshot saved to .playwright-mcp/complete-test.png');
      } else {
        console.log('❌ Signature not placed');
      }
    }
  } else {
    console.log('No saved signature, creating one...');
    
    console.log('4. Click signature tool (should open modal)');
    await page.click('.tool-button:has-text("Signature")');
    await page.waitForSelector('.signature-modal');
    
    console.log('5. Type a signature');
    await page.click('.mode-option:has-text("Type Signature")');
    await page.fill('.signature-text-input', 'John Doe');
    
    console.log('6. Save signature');
    await page.click('.save-button');
    await page.waitForSelector('.signature-modal', { state: 'hidden' });
    
    console.log('7. Click on PDF to place signature');
    const canvas = await page.$('.pdf-container canvas');
    if (canvas) {
      await canvas.click({ position: { x: 400, y: 500 } });
      await page.waitForTimeout(500);
      
      const hasAnnotation = await page.isVisible('.annotations-panel');
      if (hasAnnotation) {
        console.log('✓ Signature placed successfully');
      }
    }
  }
  
  console.log('\n=== Test Complete ===');
  await page.waitForTimeout(2000);
  await browser.close();
})();