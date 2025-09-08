import { test } from '@playwright/test';

test('Debug page loading issue', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('Page error:', error));
  
  console.log('Navigating to page...');
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  console.log('Response status:', response?.status());
  
  // Wait a bit for React to render
  await page.waitForTimeout(2000);
  
  // Check if page loaded
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check for React root
  const hasRoot = await page.locator('#root').count();
  console.log('Has #root element:', hasRoot > 0);
  
  // Get full page HTML
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  
  // Check for specific elements
  const h1Text = await page.locator('h1').textContent().catch(() => 'No h1 found');
  console.log('H1 text:', h1Text);
  
  // Check for app container
  const hasApp = await page.locator('.app').count();
  console.log('Has .app element:', hasApp > 0);
  
  // Try to find any text containing PDF
  const pdfElements = await page.locator('text=/PDF/i').count();
  console.log('Elements with "PDF" text:', pdfElements);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png' });
  console.log('Screenshot saved as debug-screenshot.png');
  
  // Check network errors
  const failedRequests: Array<{ url: string; failure: { errorText: string } | null }> = [];
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()
    });
  });
  
  await page.waitForTimeout(1000);
  if (failedRequests.length > 0) {
    console.log('Failed requests:', failedRequests);
  }
});