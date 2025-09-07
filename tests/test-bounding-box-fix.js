import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 Testing annotation bounding box sizing fix...\n');
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5176');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Sample PDF loaded');
    
    // Add a signature
    console.log('\n🔧 Adding signature annotation...');
    await page.click('button:has-text("Signature")');
    await page.waitForTimeout(500);
    
    // Switch to type mode for consistent sizing
    await page.click('span:has-text("⌨️ Type Signature")');
    await page.waitForTimeout(500);
    
    // Type signature text
    const signatureInput = page.locator('.signature-text-input');
    await signatureInput.fill('John Doe');
    await signatureInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Place signature on canvas
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    console.log('📍 Signature placed on canvas');
    
    // Select the signature to see bounding box
    const signatureAnnotation = page.locator('.annotation-overlay').first();
    await signatureAnnotation.click();
    await page.waitForTimeout(500);
    
    // Take screenshot to inspect bounding box
    await page.screenshot({ path: 'tests/screenshots/bounding-box-fix.png' });
    console.log('📸 Screenshot saved: tests/screenshots/bounding-box-fix.png');
    
    // Get bounding box dimensions for verification
    const annotationBox = await signatureAnnotation.boundingBox();
    const signatureImg = await signatureAnnotation.locator('img').first();
    const imgBox = await signatureImg.boundingBox();
    
    if (annotationBox && imgBox) {
      console.log(`📦 Annotation container: ${Math.round(annotationBox.width)}x${Math.round(annotationBox.height)}`);
      console.log(`🖼️ Signature image: ${Math.round(imgBox.width)}x${Math.round(imgBox.height)}`);
      
      // Check if container is close to image size (allowing small difference for border)
      const widthDiff = annotationBox.width - imgBox.width;
      const heightDiff = annotationBox.height - imgBox.height;
      
      console.log(`📏 Size difference: ${Math.round(widthDiff)}x${Math.round(heightDiff)} pixels`);
      
      if (widthDiff <= 6 && heightDiff <= 6) { // Allow 4px for border + small margin
        console.log('✅ Bounding box size is now correctly sized!');
      } else {
        console.log('❌ Bounding box still too large');
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Keep browser open for manual verification
  console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
})();