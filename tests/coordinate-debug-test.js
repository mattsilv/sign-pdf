import { chromium } from 'playwright';

async function testCoordinateDebugging() {
  console.log('🔍 Starting coordinate debugging test with comprehensive logging...');
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  // Capture console logs from the browser
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'log' || type === 'warn' || type === 'error') {
      console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
    }
  });
  
  try {
    // Navigate to app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(2000);
    
    // Load sample document
    console.log('2. Loading sample NDA document...');
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForTimeout(3000); // Wait for PDF to load
    
    // Add text annotation - this should trigger coordinate logging
    console.log('3. Adding text annotation...');
    await page.getByRole('button', { name: 'T Text' }).click();
    
    // Click on a specific position
    const canvas = await page.locator('canvas').first();
    console.log('4. Clicking at position (400, 200)...');
    await canvas.click({ position: { x: 400, y: 200 } });
    
    // Fill text modal
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', 'DEBUG TEST');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    console.log('5. Text annotation placed, check console for coordinate logs');
    await page.waitForTimeout(2000);
    
    // Add date annotation for comparison
    console.log('6. Adding date annotation...');
    await page.getByRole('button', { name: '📅 Date' }).click();
    console.log('7. Clicking at position (300, 300)...');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    await page.waitForTimeout(2000);
    
    // Now test export to see coordinate logs in export
    console.log('8. Testing export - this should show export coordinate logs...');
    const downloadButton = await page.getByRole('button', { name: 'Download PDF' }).first();
    
    // Start download and capture the result
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ]);
    
    console.log('9. PDF download initiated, check console for export coordinate logs');
    
    // Keep browser open to review logs
    console.log('\n✅ Coordinate debugging test complete!');
    console.log('   Review the console logs above to understand coordinate flow:');
    console.log('   - UI clicks → PDF.js conversion → PDF coordinate storage');
    console.log('   - PDF export → baseline adjustments → final positioning');
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'tests/screenshots/coordinate-debug-failure.png' });
  } finally {
    await browser.close();
  }
}

testCoordinateDebugging();