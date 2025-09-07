import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 Testing annotation label positioning and styling...\n');
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5176');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Sample PDF loaded');
    
    // Add a signature annotation
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
    await canvas.click({ position: { x: 300, y: 200 } });
    console.log('📍 Signature placed on canvas');
    
    // Add a text annotation
    console.log('\n📝 Adding text annotation...');
    await page.click('button:has-text("Text")');
    await page.waitForTimeout(500);
    
    // Click on canvas to add text
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // Enter text in modal
    const textInput = page.locator('.text-input');
    await textInput.fill('Sample Text');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    console.log('📝 Text annotation placed on canvas');
    
    // Add a checkmark annotation
    console.log('\n✅ Adding checkmark annotation...');
    await page.click('button:has-text("Check")');
    await page.waitForTimeout(500);
    await canvas.click({ position: { x: 300, y: 400 } });
    console.log('✅ Checkmark placed on canvas');
    
    // Take screenshot to verify label positioning
    await page.screenshot({ path: 'tests/screenshots/annotation-labels.png' });
    console.log('📸 Screenshot saved: tests/screenshots/annotation-labels.png');
    
    // Check label properties for first annotation
    const firstAnnotation = page.locator('.annotation-overlay').first();
    const label = firstAnnotation.locator('div').nth(1); // Order number badge should be second div
    
    const labelBox = await label.boundingBox();
    const annotationBox = await firstAnnotation.boundingBox();
    
    if (labelBox && annotationBox) {
      console.log(`\n📦 Annotation box: ${Math.round(annotationBox.width)}x${Math.round(annotationBox.height)}`);
      console.log(`🏷️ Label box: ${Math.round(labelBox.width)}x${Math.round(labelBox.height)}`);
      
      // Check if label is positioned inside annotation (bottom-left)
      const labelInsideX = labelBox.x >= annotationBox.x && labelBox.x + labelBox.width <= annotationBox.x + annotationBox.width;
      const labelInsideY = labelBox.y >= annotationBox.y && labelBox.y + labelBox.height <= annotationBox.y + annotationBox.height;
      
      if (labelInsideX && labelInsideY) {
        console.log('✅ Label is positioned inside annotation box');
      } else {
        console.log('❌ Label is positioned outside annotation box');
      }
      
      // Check label position (should be bottom-left)
      const isBottomLeft = (labelBox.y + labelBox.height) >= (annotationBox.y + annotationBox.height - 10) && 
                          labelBox.x <= (annotationBox.x + 10);
      
      if (isBottomLeft) {
        console.log('✅ Label is positioned at bottom-left');
      } else {
        console.log('❌ Label is not at bottom-left position');
      }
    }
    
    console.log('\n✅ Label test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Keep browser open for manual verification
  console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
})();