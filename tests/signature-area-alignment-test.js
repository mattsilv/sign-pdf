import { chromium } from 'playwright';

async function testSignatureAreaAlignment() {
  console.log('🎯 Testing alignment in signature area (replicating user issue)...');
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
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(2000);
    
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForTimeout(3000);
    
    const canvas = await page.locator('canvas').first();
    
    // Test 1: Place text where "matt silv" signature typically goes
    console.log('🧪 Test 1: Placing text at signature line coordinates...');
    await page.getByRole('button', { name: 'T Text' }).click();
    
    // These coordinates are approximate to where the signature appears in your images
    // Based on a standard 8.5x11 PDF at 72 DPI
    await canvas.click({ position: { x: 280, y: 150 } });
    
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', 'matt silv');
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    // Test 2: Place date on the date line 
    console.log('🧪 Test 2: Placing text on date line...');
    await page.getByRole('button', { name: 'T Text' }).click();
    await canvas.click({ position: { x: 480, y: 150 } });
    
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', '20__');
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    // Test 3: Add Party A name
    console.log('🧪 Test 3: Placing Party A name...');
    await page.getByRole('button', { name: 'T Text' }).click();
    await canvas.click({ position: { x: 350, y: 170 } });
    
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', 'Party A Name');
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    // Test 4: Add Party B name  
    console.log('🧪 Test 4: Placing Party B name...');
    await page.getByRole('button', { name: 'T Text' }).click();
    await canvas.click({ position: { x: 350, y: 190 } });
    
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', 'Party B Name');
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking screenshot of signature area UI positioning...');
    await page.screenshot({ 
      path: 'tests/screenshots/signature-area-ui.png',
      fullPage: false 
    });
    
    // Export PDF to compare
    console.log('📄 Exporting PDF for signature area comparison...');
    const downloadButton = await page.getByRole('button', { name: 'Download PDF' }).first();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ]);
    
    const fileName = 'signature-area-comparison.pdf';
    await download.saveAs(`tests/screenshots/${fileName}`);
    console.log(`PDF saved as: tests/screenshots/${fileName}`);
    
    console.log('\n🔍 Signature Area Analysis:');
    console.log('Compare signature-area-ui.png with signature-area-comparison.pdf');
    console.log('Look specifically for:');
    console.log('  1. Horizontal (X-axis) shifts in text positioning');
    console.log('  2. Text appearing to the right of where it shows in UI');  
    console.log('  3. Any discrepancies in the signature/date/name areas');
    console.log('  4. Check console logs above for exact coordinate mappings');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Signature area test failed:', error.message);
    await page.screenshot({ path: 'tests/screenshots/signature-area-failure.png' });
  } finally {
    await browser.close();
  }
}

testSignatureAreaAlignment();