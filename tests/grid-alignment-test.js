import { chromium } from 'playwright';

async function testGridAlignment() {
  console.log('🔍 GRID ALIGNMENT TEST - Testing precise coordinate mapping...');
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  // Capture ALL console logs for debugging
  page.on('console', msg => {
    const type = msg.type();
    console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
  });
  
  try {
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(2000);
    
    // Load sample document
    console.log('📄 Loading sample document...');
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForTimeout(3000);
    
    const canvas = await page.locator('canvas').first();
    
    // GRID TEST - Place text at precise grid coordinates
    // Using 100px intervals to make alignment issues obvious
    const testPoints = [
      { x: 100, y: 100, text: 'A1(100,100)' },
      { x: 200, y: 100, text: 'B1(200,100)' },
      { x: 300, y: 100, text: 'C1(300,100)' },
      { x: 100, y: 200, text: 'A2(100,200)' },
      { x: 200, y: 200, text: 'B2(200,200)' },
      { x: 300, y: 200, text: 'C2(300,200)' },
      { x: 100, y: 300, text: 'A3(100,300)' },
      { x: 200, y: 300, text: 'B3(200,300)' },
      { x: 300, y: 300, text: 'C3(300,300)' }
    ];
    
    console.log('🎯 PLACING GRID TEST POINTS...');
    for (const point of testPoints) {
      console.log(`📍 Placing "${point.text}" at canvas position (${point.x}, ${point.y})`);
      
      // Click text button
      await page.getByRole('button', { name: 'T Text' }).click();
      
      // Click at precise coordinates
      await canvas.click({ position: { x: point.x, y: point.y } });
      
      // Wait for input field and add text
      await page.waitForSelector('input[type="text"]', { timeout: 5000 });
      await page.fill('input[type="text"]', point.text);
      await page.getByRole('button', { name: 'Add Text' }).click();
      await page.waitForTimeout(500);
    }
    
    console.log('📸 Taking UI screenshot with grid annotations...');
    await page.screenshot({ 
      path: 'tests/screenshots/grid-ui.png',
      fullPage: false 
    });
    
    // Export PDF 
    console.log('📄 Exporting PDF for comparison...');
    const downloadButton = await page.getByRole('button', { name: 'Download PDF' }).first();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ]);
    
    await download.saveAs('tests/screenshots/grid-pdf.pdf');
    console.log('✅ Exported PDF: tests/screenshots/grid-pdf.pdf');
    
    console.log('\n🔍 GRID ALIGNMENT ANALYSIS:');
    console.log('========================================');
    console.log('Compare grid-ui.png with grid-pdf.pdf');
    console.log('Each text shows its intended canvas coordinates');
    console.log('Look for:');
    console.log('  ✓ Text at (100,100) should align exactly in UI and PDF');
    console.log('  ✓ Text at (200,200) should align exactly in UI and PDF');
    console.log('  ✓ Text at (300,300) should align exactly in UI and PDF');
    console.log('  ❌ Any horizontal or vertical shifts indicate coordinate bugs');
    console.log('  ❌ Check console logs above for coordinate transformation details');
    
    console.log('\n🎯 KEY DEBUGGING POINTS:');
    console.log('1. Canvas click coordinates: See "Placing" logs above');
    console.log('2. PDF.js coordinate conversion: Check browser console');
    console.log('3. PDF export coordinates: Check browser console');
    console.log('4. Visual comparison: grid-ui.png vs grid-pdf.pdf');
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Grid alignment test failed:', error.message);
    await page.screenshot({ path: 'tests/screenshots/grid-failure.png' });
  } finally {
    await browser.close();
  }
}

testGridAlignment();