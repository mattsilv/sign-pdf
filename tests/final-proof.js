import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function finalProof() {
  console.log('🚀 Starting alignment verification...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1400,900']
  });
  
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Capture console for debugging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Drawing signature') || text.includes('Using coordinates')) {
      console.log('📋 Export log:', text);
    }
  });

  try {
    // Navigate to app
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    
    // Load sample document
    await page.click('button:has-text("Try with Sample NDA Document")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Switch to signature tool
    await page.click('button:has-text("Signature")');
    await page.waitForTimeout(500);

    // Create signature
    const signaturePad = await page.locator('.signature-pad-container');
    await signaturePad.click();
    await page.keyboard.type('matt silv');
    await page.waitForTimeout(500);
    
    // Use signature
    await page.click('button:has-text("Use Signature")');
    await page.waitForTimeout(500);

    // Place signature
    console.log('📍 Placing signature...');
    const canvas = await page.locator('canvas').first();
    await canvas.click({ position: { x: 389, y: 75 } });
    await page.waitForTimeout(1500);

    // Screenshot 1: WYSIWYG
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'alignment-wysiwyg.png')
    });
    console.log('✅ WYSIWYG screenshot saved');

    // Export PDF
    console.log('💾 Exporting PDF...');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download PDF")')
    ]);
    
    const pdfPath = path.join(__dirname, 'screenshots', 'alignment-export.pdf');
    await download.saveAs(pdfPath);
    console.log('✅ PDF exported');

    console.log('\n🎯 Verification complete!');
    console.log('Check these files:');
    console.log('  - tests/screenshots/alignment-wysiwyg.png');
    console.log('  - tests/screenshots/alignment-export.pdf');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

finalProof().catch(console.error);