import { chromium } from 'playwright';

async function checkAlignment() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate and load sample
    await page.goto('http://localhost:5173');
    await page.click('text=Try with Sample NDA Document');
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Add date annotation
    await page.click('text=Date');
    const canvas = await page.locator('canvas').first();
    await canvas.click({ position: { x: 800, y: 170 } }); // Click on the date line
    
    // Add text annotation  
    await page.click('text=Text');
    await canvas.click({ position: { x: 450, y: 250 } }); // Click on Party A line
    await page.waitForSelector('input[type="text"]');
    await page.fill('input[type="text"]', '9/5/2025');
    await page.click('button:has-text("Add Text")');
    
    // Add checkmark
    await page.click('text=Check');
    await canvas.click({ position: { x: 350, y: 280 } }); // Click on checkmark area
    
    console.log('Annotations added. Check UI positioning, then export to verify PDF alignment.');
    
    // Keep browser open for manual verification
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

checkAlignment();