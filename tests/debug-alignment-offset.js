import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function debugAlignmentIssue() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[EXPORT]') || text.includes('[UI]') || text.includes('[ALIGNMENT]')) {
      console.log(text);
    }
  });

  console.log('🔍 Loading app...');
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(2000);

  // Load sample document
  console.log('📄 Loading sample NDA...');
  await page.click('button:has-text("Try with Sample NDA Document")');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Switch to signature tool
  console.log('✏️ Switching to signature tool...');
  await page.click('button:has-text("Signature")');
  await page.waitForTimeout(1000);

  // Type "matt silv" in signature pad
  console.log('✍️ Creating signature...');
  const signaturePad = await page.locator('.signature-pad-container');
  await signaturePad.click();
  await page.keyboard.type('matt silv');
  await page.waitForTimeout(500);

  // Click Use Signature
  await page.click('button:has-text("Use Signature")');
  await page.waitForTimeout(1000);

  // Place signature at specific coordinates (matching your screenshot)
  console.log('📍 Placing signature at specific position...');
  const canvas = await page.locator('canvas').first();
  
  // Click at approximately where you placed it (after "matt silv")
  await canvas.click({ position: { x: 389, y: 75 } });
  await page.waitForTimeout(2000);

  // Take screenshot of placement
  await page.screenshot({ 
    path: 'tests/screenshots/wysiwyg-placement.png',
    fullPage: false 
  });
  console.log('📸 WYSIWYG screenshot saved');

  // Export PDF
  console.log('💾 Exporting PDF...');
  await page.click('button:has-text("Download PDF")');
  
  // Wait for download
  const downloadPromise = page.waitForEvent('download');
  const download = await downloadPromise;
  const pdfPath = path.join('tests/screenshots', 'exported.pdf');
  await download.saveAs(pdfPath);
  console.log('✅ PDF exported to:', pdfPath);

  // Get console logs to analyze coordinates
  console.log('\n🔍 Analyzing coordinate transformation:');
  
  // Keep page open for manual inspection
  console.log('\n⚠️ Browser will stay open for manual inspection. Press Ctrl+C to close.');
  await page.waitForTimeout(60000);
  
  await browser.close();
}

debugAlignmentIssue().catch(console.error);