import { chromium } from 'playwright';

async function testTextBaseline() {
  console.log('🔍 TEXT BASELINE DEBUG - Isolating text positioning issue...');
  const browser = await chromium.launch({ headless: false, slowMo: 2000 });
  const page = await browser.newPage();
  
  // Capture ALL console logs for debugging
  page.on('console', msg => {
    const type = msg.type();
    console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
  });
  
  try {
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);
    
    // Load sample document
    console.log('📄 Loading sample document...');
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForTimeout(3000);
    
    const canvas = await page.locator('canvas').first();
    
    // SINGLE TEST POINT to isolate baseline issue
    const testX = 200;
    const testY = 200;
    const testText = 'BASELINE-TEST';
    
    console.log(`📍 Placing text "${testText}" at canvas (${testX}, ${testY})`);
    console.log('🔍 This should help us see if text baseline compensation is working correctly');
    
    // Click text button and place text
    await page.getByRole('button', { name: 'T Text' }).click();
    await canvas.click({ position: { x: testX, y: testY } });
    
    // Wait for input field and add text
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', testText);
    await page.getByRole('button', { name: 'Add Text' }).click();
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking UI screenshot for text positioning...');
    await page.screenshot({ 
      path: 'tests/screenshots/text-baseline-ui.png',
      fullPage: false 
    });
    
    // Export PDF 
    console.log('📄 Exporting PDF to compare baseline positioning...');
    const downloadButton = await page.getByRole('button', { name: 'Download PDF' }).first();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click()
    ]);
    
    await download.saveAs('tests/screenshots/text-baseline-pdf.pdf');
    console.log('✅ Exported files:');
    console.log('   UI: tests/screenshots/text-baseline-ui.png');
    console.log('   PDF: tests/screenshots/text-baseline-pdf.pdf');
    
    console.log('\n🔍 BASELINE ANALYSIS INSTRUCTIONS:');
    console.log('========================================');
    console.log('1. Open both files side by side');
    console.log('2. Look at where "BASELINE-TEST" appears relative to cursor position (200, 200)');
    console.log('3. In UI screenshot: text should be positioned by TOP-LEFT of text container');
    console.log('4. In PDF: text should be positioned by BASELINE of text');
    console.log('5. If PDF text appears BELOW UI text: baseline compensation is going wrong direction');
    console.log('6. If PDF text appears ABOVE UI text: need to INCREASE baseline compensation');
    console.log('7. If they match perfectly: the coordinate system issue is elsewhere');
    
    console.log('\n🔧 DEBUG KEY POINTS FROM LOGS:');
    console.log('• Check "PDF.js conversion result" for coordinate accuracy');
    console.log('• Check "EXPORT" logs for baseline adjustment being applied');
    console.log('• Compare "UI Rendering" vs "EXPORT" coordinates');
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('❌ Text baseline test failed:', error.message);
    await page.screenshot({ path: 'tests/screenshots/text-baseline-error.png' });
  } finally {
    await browser.close();
  }
}

testTextBaseline();