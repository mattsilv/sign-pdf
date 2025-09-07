import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function captureAlignmentProof() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1400,900']
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // Enable detailed console logging
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[EXPORT]') || text.includes('[ALIGNMENT]') || text.includes('Drawing signature')) {
      console.log('📋', text);
    }
  });

  try {
    console.log('🚀 Starting alignment proof capture...');
    
    // Navigate to app
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

    // Create signature
    console.log('✍️ Creating "matt silv" signature...');
    const signaturePad = await page.locator('.signature-pad-container');
    await signaturePad.click();
    
    // Clear any existing signature first
    const clearButton = page.locator('button:has-text("Clear Signature")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }
    
    // Type the signature
    await page.keyboard.type('matt silv');
    await page.waitForTimeout(500);
    
    // Use signature
    await page.click('button:has-text("Use Signature")');
    await page.waitForTimeout(1000);

    // Place signature at specific position (right after "matt silv" text in document)
    console.log('📍 Placing signature at position (389, 75)...');
    const canvas = await page.locator('canvas').first();
    
    // Click to place signature
    await canvas.click({ position: { x: 389, y: 75 } });
    await page.waitForTimeout(2000);

    // Take screenshot of WYSIWYG
    const wysiwygPath = path.join(__dirname, 'screenshots', 'proof-wysiwyg.png');
    await page.screenshot({ 
      path: wysiwygPath,
      fullPage: false 
    });
    console.log('📸 WYSIWYG screenshot saved to:', wysiwygPath);

    // Now export the PDF
    console.log('💾 Exporting PDF...');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF")');
    
    // Save the PDF
    const download = await downloadPromise;
    const pdfPath = path.join(__dirname, 'screenshots', 'proof-exported.pdf');
    await download.saveAs(pdfPath);
    console.log('📄 PDF saved to:', pdfPath);

    // Wait a moment for any final console logs
    await page.waitForTimeout(2000);

    // Filter and display relevant logs
    console.log('\n🔍 Export Coordinate Analysis:');
    const exportLogs = logs.filter(log => 
      log.includes('Using coordinates') || 
      log.includes('Drawing signature') ||
      log.includes('Anchor')
    );
    exportLogs.forEach(log => console.log('  ', log));

    console.log('\n✅ Screenshots captured! Please check:');
    console.log('   - WYSIWYG: tests/screenshots/proof-wysiwyg.png');
    console.log('   - PDF: tests/screenshots/proof-exported.pdf');
    console.log('\nThe signature should appear in the SAME position in both.');

  } catch (error) {
    console.error('❌ Error during capture:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

captureAlignmentProof().catch(console.error);