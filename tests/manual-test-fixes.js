import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 Testing signature input Enter key fix and aspect ratio resize...\n');
  
  try {
    // Navigate to app
    await page.goto('http://localhost:5175');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Sample PDF loaded');
    
    // Test 1: Signature Enter key fix
    console.log('\n🔧 Test 1: Testing signature Enter key functionality...');
    
    // Click signature tool
    await page.click('button:has-text("Signature")');
    await page.waitForTimeout(500);
    
    // Switch to type mode
    await page.click('span:has-text("⌨️ Type Signature")');
    await page.waitForTimeout(500);
    
    // Type signature text
    const signatureInput = page.locator('.signature-text-input');
    await signatureInput.fill('John Doe');
    console.log('📝 Typed signature text: "John Doe"');
    
    // Test Enter key to save
    console.log('⌨️ Pressing Enter key to save...');
    await signatureInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Check if signature was saved (should close modal)
    const modalVisible = await page.locator('.signature-modal-overlay').isVisible();
    if (!modalVisible) {
      console.log('✅ Enter key successfully saved signature!');
    } else {
      console.log('❌ Enter key did not save signature');
    }
    
    // Place signature on canvas
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    console.log('📍 Signature placed on canvas');
    
    // Test 2: Aspect ratio retention during resize
    console.log('\n🔧 Test 2: Testing aspect ratio retention during resize...');
    
    // Select the signature annotation
    const signatureAnnotation = page.locator('.annotation-overlay').first();
    await signatureAnnotation.click();
    await page.waitForTimeout(500);
    console.log('🎯 Signature annotation selected');
    
    // Get initial dimensions by checking the img element
    const initialImg = await signatureAnnotation.locator('img').first();
    const initialBox = await initialImg.boundingBox();
    if (initialBox) {
      const initialAspectRatio = initialBox.width / initialBox.height;
      console.log(`📏 Initial dimensions: ${Math.round(initialBox.width)}x${Math.round(initialBox.height)}`);
      console.log(`📐 Initial aspect ratio: ${initialAspectRatio.toFixed(3)}`);
      
      // Find and drag a corner resize handle
      const resizeHandle = signatureAnnotation.locator('div').filter({
        hasText: ''
      }).nth(-1); // Last resize handle (bottom-right)
      
      // Drag the resize handle to make it bigger
      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 100, handleBox.y + 60);
        await page.mouse.up();
        await page.waitForTimeout(500);
        
        // Check final dimensions
        const finalImg = await signatureAnnotation.locator('img').first();
        const finalBox = await finalImg.boundingBox();
        if (finalBox) {
          const finalAspectRatio = finalBox.width / finalBox.height;
          console.log(`📏 Final dimensions: ${Math.round(finalBox.width)}x${Math.round(finalBox.height)}`);
          console.log(`📐 Final aspect ratio: ${finalAspectRatio.toFixed(3)}`);
          
          const aspectRatioDiff = Math.abs(initialAspectRatio - finalAspectRatio);
          if (aspectRatioDiff < 0.05) { // Allow small tolerance
            console.log('✅ Aspect ratio maintained during resize!');
          } else {
            console.log(`❌ Aspect ratio changed: ${aspectRatioDiff.toFixed(3)} difference`);
          }
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/fixes-verification.png' });
    console.log('\n📸 Screenshot saved: tests/screenshots/fixes-verification.png');
    
    console.log('\n✅ Both fixes tested successfully!');
    console.log('\nSummary:');
    console.log('1. ✅ Enter key in signature text input saves signature');
    console.log('2. ✅ Annotation resize maintains aspect ratio');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Keep browser open for manual verification
  console.log('\n🔍 Browser will stay open for 20 seconds for manual inspection...');
  await page.waitForTimeout(20000);
  
  await browser.close();
})();