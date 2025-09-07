import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  try {
    console.log('Loading app...');
    await page.goto('http://localhost:5175');
    
    console.log('Loading sample document...');
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await page.waitForSelector('text=Tools', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('Creating signature...');
    await page.getByRole('button', { name: 'Typed', exact: true }).click();
    await page.locator('#full-name').fill('Alignment Test');
    await page.getByRole('button', { name: 'Use This Signature' }).click();
    
    console.log('Placing signature...');
    await page.getByRole('button', { name: 'Signature' }).click();
    
    // Place at exact center of visible area
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    
    await canvas.click({ position: { x: centerX, y: centerY } });
    await page.waitForTimeout(1000);
    
    console.log(`Placed signature at center: (${centerX}, ${centerY})`);
    
    // Take WYSIWYG screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'wysiwyg.png'),
      fullPage: false
    });
    console.log('✅ WYSIWYG screenshot saved');
    
    // Export PDF
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const download = await downloadPromise;
    
    const pdfPath = path.join(screenshotDir, 'exported.pdf');
    await download.saveAs(pdfPath);
    console.log('✅ PDF exported');
    
    // Open PDF in new tab
    const pdfPage = await browser.newPage();
    await pdfPage.goto(`file://${pdfPath}`);
    await pdfPage.waitForTimeout(2000);
    
    // Take PDF screenshot
    await pdfPage.screenshot({ 
      path: path.join(screenshotDir, 'pdf-view.png'),
      fullPage: false
    });
    console.log('✅ PDF screenshot saved');
    
    console.log('\n📁 Screenshots saved in tests/screenshots/');
    console.log('Compare wysiwyg.png and pdf-view.png to check alignment');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();