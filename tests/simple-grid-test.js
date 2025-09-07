import { chromium } from 'playwright';

async function simpleGridTest() {
  console.log('🎯 SIMPLE GRID TEST - 3 precise points only');
  const browser = await chromium.launch({ headless: false, slowMo: 1500 });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'log' || type === 'warn' || type === 'error') {
      console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
    }
  });
  
  try {
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);
    
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForTimeout(3000);
    
    const canvas = await page.locator('canvas').first();
    
    // Test just 3 precise points
    const testPoints = [
      { x: 150, y: 150, text: 'POINT-A' },
      { x: 250, y: 150, text: 'POINT-B' },
      { x: 350, y: 150, text: 'POINT-C' }
    ];
    
    console.log('🎯 Placing 3 test points...');
    for (const point of testPoints) {
      console.log(`📍 Placing "${point.text}" at canvas (${point.x}, ${point.y})`);
      
      await page.getByRole('button', { name: 'T Text' }).click();
      await canvas.click({ position: { x: point.x, y: point.y } });
      
      await page.waitForSelector('input[type="text"]', { timeout: 5000 });
      await page.fill('input[type="text"]', point.text);
      await page.getByRole('button', { name: 'Add Text' }).click();
      await page.waitForTimeout(1000);
    }
    
    console.log('📸 Taking UI screenshot...');
    await page.screenshot({ 
      path: 'tests/screenshots/simple-grid-ui.png',
      fullPage: false 
    });
    
    console.log('📄 Exporting PDF...');
    const downloadButton = await page.getByRole('button', { name: 'Download PDF' }).first();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ]);
    
    await download.saveAs('tests/screenshots/simple-grid-pdf.pdf');
    console.log('✅ Files saved: simple-grid-ui.png and simple-grid-pdf.pdf');
    
    console.log('\n🔍 COMPARE FILES:');
    console.log('UI: tests/screenshots/simple-grid-ui.png');
    console.log('PDF: tests/screenshots/simple-grid-pdf.pdf');
    console.log('Look for horizontal shifts in text positioning');
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('❌ Simple grid test failed:', error);
    await page.screenshot({ path: 'tests/screenshots/simple-grid-error.png' });
  } finally {
    await browser.close();
  }
}

simpleGridTest();