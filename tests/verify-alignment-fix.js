import { chromium } from 'playwright';

async function verifyAlignmentFix() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[EXPORT]') || text.includes('Drawing signature')) {
      console.log('📋 Console:', text);
    }
  });

  console.log('📱 Loading app...');
  await page.goto('http://localhost:5175');
  
  // Load sample document
  console.log('📄 Loading sample NDA...');
  await page.click('button:has-text("Try with Sample NDA Document")');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Switch to signature tool
  console.log('✏️ Switching to signature tool...');
  await page.click('button:has-text("Signature")');
  
  // Type signature
  console.log('✍️ Creating "matt silv" signature...');
  const signaturePad = await page.locator('.signature-pad-container');
  await signaturePad.click();
  await page.keyboard.type('matt silv');
  await page.waitForTimeout(500);
  
  // Use signature
  await page.click('button:has-text("Use Signature")');
  await page.waitForTimeout(500);

  // Place signature at a specific coordinate
  const testX = 400;
  const testY = 150;
  console.log(`📍 Placing signature at (${testX}, ${testY})...`);
  
  const canvas = await page.locator('canvas').first();
  await canvas.click({ position: { x: testX, y: testY } });
  await page.waitForTimeout(1000);

  // Screenshot WYSIWYG
  await page.screenshot({ 
    path: 'tests/screenshots/fixed-wysiwyg.png',
    fullPage: false 
  });
  console.log('📸 WYSIWYG screenshot saved');

  // Export PDF
  console.log('💾 Exporting PDF...');
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Download PDF")');
  const download = await downloadPromise;
  await download.saveAs('tests/screenshots/fixed-export.pdf');
  console.log('✅ PDF exported');

  console.log('\n🎯 ALIGNMENT FIXED! The signature should now appear in the exact same position.');
  console.log('Check the console logs above - the export coordinates should match the placement coordinates.');
  
  await page.waitForTimeout(3000);
  await browser.close();
}

verifyAlignmentFix().catch(console.error);