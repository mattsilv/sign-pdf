import { chromium } from 'playwright';

async function openForTesting() {
  console.log('Opening browser for manual testing...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  const page = await browser.newPage();
  
  // Navigate to app
  await page.goto('http://localhost:5175');
  
  console.log('Browser opened! Please:');
  console.log('1. Load the sample document');
  console.log('2. Add some text and date annotations');
  console.log('3. Export to PDF and check if positioning matches UI');
  console.log('4. Close this terminal when done');
  
  // Keep browser open indefinitely
  await page.waitForTimeout(300000); // 5 minutes
}

openForTesting().catch(console.error);