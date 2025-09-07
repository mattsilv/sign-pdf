import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🎨 CSS Playground - Testing annotation styling...\n');
  
  try {
    // Navigate to playground
    await page.goto('http://localhost:5176?playground=true');
    console.log('✅ Playground loaded');
    
    // Wait for content to render
    await page.waitForTimeout(1000);
    
    // Take screenshot of the playground
    await page.screenshot({ 
      path: 'tests/screenshots/styling-playground.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: tests/screenshots/styling-playground.png');
    
    // Get label properties for analysis
    const labelInfo = await page.evaluate(() => {
      const labels = document.querySelectorAll('div[style*="position: absolute"][style*="bottom: 2px"]');
      return Array.from(labels).map((label, index) => {
        const rect = label.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(label);
        return {
          index: index + 1,
          fontSize: computedStyle.fontSize,
          padding: computedStyle.padding,
          backgroundColor: computedStyle.backgroundColor,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: label.textContent
        };
      });
    });
    
    console.log('\n📊 Current Label Styles:');
    labelInfo.forEach(info => {
      console.log(`  Label ${info.index} (${info.text}):`);
      console.log(`    Font Size: ${info.fontSize}`);
      console.log(`    Dimensions: ${info.width}x${info.height}px`);
      console.log(`    Padding: ${info.padding}`);
      console.log('');
    });
    
    console.log('✅ Styling analysis completed!');
    
  } catch (error) {
    console.error('❌ Playground test failed:', error.message);
  }
  
  // Keep browser open for manual tweaking
  console.log('🔍 Browser will stay open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('✅ Done!');
})();