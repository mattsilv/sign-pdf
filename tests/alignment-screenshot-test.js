import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎯 Starting Alignment Screenshot Test\n');
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5175');
    console.log('✅ App loaded');
    
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForSelector('text=Tools', { timeout: 10000 });
    console.log('✅ Sample document loaded');
    
    // Wait for PDF to fully render
    await page.waitForTimeout(2000);
    
    // Create a typed signature with distinctive text
    await page.getByRole('button', { name: 'Typed', exact: true }).click();
    await page.locator('#full-name').fill('John Smith');
    await page.getByRole('button', { name: 'Use This Signature' }).click();
    console.log('✅ Signature created: "John Smith"');
    
    // Enable signature tool
    await page.getByRole('button', { name: 'Signature' }).click();
    console.log('✅ Signature tool activated');
    
    // Place signature at a specific location on the first page
    // Using coordinates that should be visible in the viewport
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 300, y: 400 } });
    await page.waitForTimeout(1000);
    console.log('✅ Signature placed at position (300, 400)');
    
    // Take screenshot of WYSIWYG placement
    const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, 'wysiwyg-placement.png'),
      fullPage: false
    });
    console.log('📸 Screenshot saved: wysiwyg-placement.png');
    
    // Add a text annotation to mark the location
    await page.getByRole('button', { name: 'Text' }).click();
    await page.locator('canvas').first().click({ position: { x: 300, y: 450 } });
    await page.keyboard.type('← Signature placed here');
    await page.keyboard.press('Escape');
    console.log('✅ Added marker text');
    
    // Take another screenshot with marker
    await page.screenshot({ 
      path: path.join(screenshotDir, 'wysiwyg-with-marker.png'),
      fullPage: false
    });
    console.log('📸 Screenshot saved: wysiwyg-with-marker.png');
    
    // Export PDF
    console.log('\n📄 Exporting PDF...');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const download = await downloadPromise;
    
    const exportPath = path.join(screenshotDir, 'exported-with-signature.pdf');
    await download.saveAs(exportPath);
    console.log('✅ PDF exported to:', exportPath);
    
    // Now open the exported PDF in a new tab to verify alignment
    console.log('\n🔍 Opening exported PDF to verify alignment...');
    const newPage = await browser.newPage();
    await newPage.goto(`file://${exportPath}`);
    await newPage.waitForTimeout(3000);
    
    // Take screenshot of the exported PDF
    await newPage.screenshot({ 
      path: path.join(screenshotDir, 'exported-pdf-view.png'),
      fullPage: false
    });
    console.log('📸 Screenshot saved: exported-pdf-view.png');
    
    console.log('\n' + '='.repeat(60));
    console.log('ALIGNMENT TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nScreenshots saved in: tests/screenshots/');
    console.log('• wysiwyg-placement.png - Original placement in editor');
    console.log('• wysiwyg-with-marker.png - With location marker');
    console.log('• exported-pdf-view.png - How it appears in exported PDF');
    console.log('• exported-with-signature.pdf - The actual exported PDF');
    console.log('\nCompare these screenshots to verify alignment accuracy.');
    console.log('='.repeat(60));
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will stay open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();