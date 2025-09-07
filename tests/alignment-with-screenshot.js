import { chromium } from 'playwright';

async function testAlignmentWithScreenshot() {
  console.log('Starting alignment test with screenshots...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);
    
    // Take initial screenshot to see what's on page
    console.log('2. Taking initial screenshot...');
    await page.screenshot({ path: 'tests/screenshots/01-initial-page.png' });
    
    // Try multiple selectors for the sample document button
    console.log('3. Looking for sample document button...');
    
    // Try different ways to find the button
    const possibleSelectors = [
      () => page.getByText('Try with Sample NDA Document'),
      () => page.getByText('Sample NDA Document'),  
      () => page.locator('text=Try with Sample NDA Document'),
      () => page.locator('button:has-text("Sample")'),
      () => page.locator('[class*="sample"]'),
    ];
    
    let documentLoaded = false;
    for (const selector of possibleSelectors) {
      try {
        console.log(`   Trying selector: ${selector}`);
        await selector().click({ timeout: 3000 });
        console.log('   ✅ Found and clicked sample button!');
        documentLoaded = true;
        break;
      } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
      }
    }
    
    if (!documentLoaded) {
      console.log('   Manual fallback: trying to find any button with "sample" or "nda"');
      await page.screenshot({ path: 'tests/screenshots/02-looking-for-button.png' });
      // Just wait and let user manually click
      console.log('   Please manually click the sample document button in the browser');
      await page.waitForTimeout(10000);
    }
    
    // Wait for PDF to potentially load
    console.log('4. Waiting for PDF to load...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/03-after-document-load.png' });
    
    // Try to find the canvas
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      console.log('5. Canvas found! Adding annotations...');
      
      // Add date
      try {
        await page.getByRole('button', { name: 'Date' }).click();
        await canvas.click({ position: { x: 800, y: 170 } });
        console.log('   ✅ Date annotation added');
        await page.screenshot({ path: 'tests/screenshots/04-date-added.png' });
      } catch (e) {
        console.log(`   ❌ Date failed: ${e.message}`);
      }
      
      // Add text 
      try {
        await page.getByRole('button', { name: 'Text' }).click();
        await canvas.click({ position: { x: 450, y: 250 } });
        await page.waitForSelector('input[type="text"]', { timeout: 3000 });
        await page.fill('input[type="text"]', '9/5/2025');
        await page.getByRole('button', { name: 'Add Text' }).click();
        console.log('   ✅ Text annotation added');
        await page.screenshot({ path: 'tests/screenshots/05-text-added.png' });
      } catch (e) {
        console.log(`   ❌ Text failed: ${e.message}`);
      }
      
      // Add checkmark
      try {
        await page.getByRole('button', { name: 'Check' }).click();
        await canvas.click({ position: { x: 350, y: 280 } });
        console.log('   ✅ Checkmark added');
        await page.screenshot({ path: 'tests/screenshots/06-final-annotations.png' });
      } catch (e) {
        console.log(`   ❌ Checkmark failed: ${e.message}`);
      }
      
      console.log('6. All done! Check screenshots in tests/screenshots/');
      console.log('   Now export PDF manually to verify alignment!');
      
    } else {
      console.log('5. No canvas found - PDF may not have loaded');
      await page.screenshot({ path: 'tests/screenshots/05-no-canvas.png' });
    }
    
    // Keep browser open for manual verification
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'tests/screenshots/error.png' });
  } finally {
    await browser.close();
  }
}

testAlignmentWithScreenshot();