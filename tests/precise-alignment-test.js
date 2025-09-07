import { chromium } from 'playwright';

async function testPreciseAlignment() {
  console.log('🎯 Testing precise alignment with exact coordinates...');
  const browser = await chromium.launch({ headless: false, slowMo: 2000 });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'log' || type === 'warn' || type === 'error') {
      console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
    }
  });
  
  try {
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(2000);
    
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForTimeout(3000);
    
    // Test 1: Place text at a very specific location
    console.log('🧪 Test 1: Placing text at (200, 100)...');
    await page.getByRole('button', { name: 'T Text' }).click();
    
    const canvas = await page.locator('canvas').first();
    await canvas.click({ position: { x: 200, y: 100 } });
    
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', 'X=200 Y=100');
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    // Test 2: Place text at another location
    console.log('🧪 Test 2: Placing text at (400, 200)...');
    await page.getByRole('button', { name: 'T Text' }).click();
    await canvas.click({ position: { x: 400, y: 200 } });
    
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', 'X=400 Y=200');
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    // Test 3: Add a date for comparison
    console.log('🧪 Test 3: Placing date at (300, 300)...');
    await page.getByRole('button', { name: '📅 Date' }).click();
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking screenshot of UI positioning...');
    await page.screenshot({ 
      path: 'tests/screenshots/precise-ui-positioning.png',
      fullPage: false 
    });
    
    // Export PDF to compare
    console.log('📄 Exporting PDF...');
    const downloadButton = await page.getByRole('button', { name: 'Download PDF' }).first();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ]);
    
    const fileName = await download.suggestedFilename();
    await download.saveAs(`tests/screenshots/${fileName}`);
    console.log(`PDF saved as: tests/screenshots/${fileName}`);
    
    console.log('\n🔍 Analysis Instructions:');
    console.log('1. Compare precise-ui-positioning.png with the downloaded PDF');
    console.log('2. Check if text appears at the same relative positions');
    console.log('3. Look specifically at X-axis vs Y-axis alignment differences');
    console.log('4. The console logs above show exact coordinate transformations');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'tests/screenshots/precise-alignment-failure.png' });
  } finally {
    await browser.close();
  }
}

testPreciseAlignment();