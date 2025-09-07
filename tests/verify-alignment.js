import { chromium } from 'playwright';

async function verifyAlignment() {
  console.log('Starting alignment verification...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5176');
    
    // Load sample document - use getByText for exact text matching
    console.log('2. Loading sample document...');
    await page.getByText('Try with Sample NDA Document').click();
    
    // Wait for PDF to load
    console.log('3. Waiting for PDF to load...');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Select date tool and add date - use getByRole for buttons
    console.log('4. Adding date annotation...');
    await page.getByRole('button', { name: 'Date' }).click();
    const canvas = await page.locator('canvas').first();
    await canvas.click({ position: { x: 800, y: 170 } });
    
    // Select text tool and add text
    console.log('5. Adding text annotation...');
    await page.getByRole('button', { name: 'Text' }).click();
    await canvas.click({ position: { x: 450, y: 250 } });
    
    // Fill text modal
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    await page.fill('input[type="text"]', '9/5/2025');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Add checkmark
    console.log('6. Adding checkmark...');
    await page.getByRole('button', { name: 'Check' }).click();
    await canvas.click({ position: { x: 350, y: 280 } });
    
    console.log('7. Annotations added! Now manually:');
    console.log('   - Check if annotations are positioned correctly in UI');
    console.log('   - Click "Download PDF" to export');
    console.log('   - Compare PDF positioning with UI positioning');
    
    // Keep browser open for manual verification
    await page.waitForTimeout(60000); // Wait 1 minute for manual testing
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

verifyAlignment();