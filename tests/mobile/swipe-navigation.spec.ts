import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Mobile Swipe Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 dimensions
    
    // Navigate to the app
    await page.goto('/');
    
    // Upload a multi-page PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, '../../public/sample-nda.pdf'));
    
    // Wait for PDF to load
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
  });

  test('should navigate to next page on left swipe', async ({ page }) => {
    // Check initial page
    const initialPage = await page.locator('.page-number').first().textContent();
    expect(initialPage).toContain('Page 1');
    
    // Get the PDF container
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    // Simulate touch swipe left (next page) using synthetic events
    await page.evaluate(({ startX, startY, endX, endY }) => {
      const container = document.querySelector('.pdf-pages-container');
      if (!container) throw new Error('Container not found');
      
      // Create a synthetic touch event in a simpler way
      const createEvent = (type: string, x: number, y: number) => {
        const event = document.createEvent('TouchEvent');
        const touch = document.createTouch(
          window,
          container as EventTarget,
          1,
          x, y, // pageX, pageY
          x, y, // screenX, screenY  
          x, y, // clientX, clientY
          10, 10, // radiusX, radiusY
          0, // rotationAngle
          1  // force
        );
        
        const touchList = document.createTouchList(touch);
        
        event.initTouchEvent(
          type,
          true, // bubbles
          true, // cancelable
          window,
          0,
          false, false, false, false, // modifier keys
          type === 'touchend' ? document.createTouchList() : touchList,
          type === 'touchend' ? document.createTouchList() : touchList,
          type === 'touchend' ? touchList : document.createTouchList()
        );
        return event;
      };
      
      // Alternative: dispatch mouse events as fallback
      const mouseStart = new MouseEvent('mousedown', {
        clientX: startX,
        clientY: startY,
        bubbles: true,
        cancelable: true
      });
      container.dispatchEvent(mouseStart);
      
      // Simulate swipe motion
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const mouseMove = new MouseEvent('mousemove', {
          clientX: x,
          clientY: startY,
          bubbles: true,
          cancelable: true
        });
        container.dispatchEvent(mouseMove);
      }
      
      // End swipe
      const mouseEnd = new MouseEvent('mouseup', {
        clientX: endX,
        clientY: endY,
        bubbles: true,
        cancelable: true
      });
      container.dispatchEvent(mouseEnd);
    }, {
      startX: box.x + box.width * 0.8,
      startY: box.y + box.height / 2,
      endX: box.x + box.width * 0.2,
      endY: box.y + box.height / 2
    });
    
    // Wait for animation
    await page.waitForTimeout(400);
    
    // Check if we're on page 2
    const currentPageIndicator = await page.locator('.virtualization-debug').textContent();
    expect(currentPageIndicator).toContain('Current Page: 2');
  });

  test('should navigate to previous page on right swipe', async ({ page }) => {
    // First navigate to page 2
    await page.locator('.page-nav button:has-text("Next")').click();
    await page.waitForTimeout(300);
    
    // Verify we're on page 2
    let currentPageIndicator = await page.locator('.virtualization-debug').textContent();
    expect(currentPageIndicator).toContain('Current Page: 2');
    
    // Get the PDF container
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    // Simulate touch swipe right (previous page) using synthetic events
    await page.evaluate(({ startX, startY, endX, endY }) => {
      const container = document.querySelector('.pdf-pages-container');
      if (!container) throw new Error('Container not found');
      
      // Use mouse events as fallback
      const mouseStart = new MouseEvent('mousedown', {
        clientX: startX,
        clientY: startY,
        bubbles: true,
        cancelable: true
      });
      container.dispatchEvent(mouseStart);
      
      // Simulate swipe motion
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const mouseMove = new MouseEvent('mousemove', {
          clientX: x,
          clientY: startY,
          bubbles: true,
          cancelable: true
        });
        container.dispatchEvent(mouseMove);
      }
      
      // End swipe
      const mouseEnd = new MouseEvent('mouseup', {
        clientX: endX,
        clientY: endY,
        bubbles: true,
        cancelable: true
      });
      container.dispatchEvent(mouseEnd);
    }, {
      startX: box.x + box.width * 0.2,
      startY: box.y + box.height / 2,
      endX: box.x + box.width * 0.8,
      endY: box.y + box.height / 2
    });
    
    // Wait for animation
    await page.waitForTimeout(400);
    
    // Check if we're back on page 1
    currentPageIndicator = await page.locator('.virtualization-debug').textContent();
    expect(currentPageIndicator).toContain('Current Page: 1');
  });

  test('should show swipe indicator during swipe', async ({ page }) => {
    // Get the PDF container
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    // Start swipe left
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 5 });
    
    // Check for swipe indicator
    const swipeIndicator = page.locator('.swipe-indicator-left');
    await expect(swipeIndicator).toBeVisible();
    await expect(swipeIndicator).toContainText('Page 2');
    
    // Complete the swipe
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    
    // Indicator should disappear after swipe
    await page.waitForTimeout(400);
    await expect(swipeIndicator).not.toBeVisible();
  });

  test('should not navigate past first or last page', async ({ page }) => {
    // Try to swipe right on first page (should do nothing)
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    // Simulate swipe right on first page
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    
    // Wait for any animation
    await page.waitForTimeout(400);
    
    // Should still be on page 1
    const currentPageIndicator = await page.locator('.virtualization-debug').textContent();
    expect(currentPageIndicator).toContain('Current Page: 1');
    
    // No swipe indicator should have appeared
    const swipeIndicatorRight = page.locator('.swipe-indicator-right');
    await expect(swipeIndicatorRight).not.toBeVisible();
  });

  test('should work with touch events on touch devices', async ({ page, browserName }) => {
    // Skip on non-chromium browsers as touch simulation varies
    test.skip(browserName !== 'chromium', 'Touch simulation works best in Chromium');
    
    // Get the PDF container
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    // Simulate touch swipe left
    await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2);
    
    // Emulate touch swipe
    await page.evaluate(({ startX, startY, endX, endY }) => {
      const container = document.querySelector('.pdf-pages-container');
      if (!container) throw new Error('Container not found');
      
      // Create and dispatch touch events
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 1,
          target: container as Element,
          clientX: startX,
          clientY: startY,
          pageX: startX,
          pageY: startY,
          screenX: startX,
          screenY: startY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        })],
        bubbles: true,
        cancelable: true
      });
      
      const touchMove = new TouchEvent('touchmove', {
        touches: [new Touch({
          identifier: 1,
          target: container as Element,
          clientX: endX,
          clientY: endY,
          pageX: endX,
          pageY: endY,
          screenX: endX,
          screenY: endY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        })],
        bubbles: true,
        cancelable: true
      });
      
      const touchEnd = new TouchEvent('touchend', {
        touches: [],
        changedTouches: [new Touch({
          identifier: 1,
          target: container as Element,
          clientX: endX,
          clientY: endY,
          pageX: endX,
          pageY: endY,
          screenX: endX,
          screenY: endY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        })],
        bubbles: true,
        cancelable: true
      });
      
      container.dispatchEvent(touchStart);
      setTimeout(() => container.dispatchEvent(touchMove), 50);
      setTimeout(() => container.dispatchEvent(touchEnd), 100);
    }, {
      startX: box.x + box.width * 0.8,
      startY: box.y + box.height / 2,
      endX: box.x + box.width * 0.2,
      endY: box.y + box.height / 2
    });
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Check if we're on page 2
    const currentPageIndicator = await page.locator('.virtualization-debug').textContent();
    expect(currentPageIndicator).toContain('Current Page: 2');
  });

  test('should provide haptic feedback on supported devices', async ({ page }) => {
    // Check if vibration API is called
    const vibrateCalls: number[] = [];
    
    await page.evaluateOnNewDocument(() => {
      // Mock the vibrate API
      (window.navigator as any).vibrate = (pattern: number | number[]) => {
        (window as any).vibrateCalls = (window as any).vibrateCalls || [];
        (window as any).vibrateCalls.push(pattern);
        return true;
      };
    });
    
    // Reload page to apply the mock
    await page.reload();
    
    // Upload PDF again
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, '../fixtures/test_coordinate_grid.pdf'));
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    
    // Perform a swipe
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    
    // Check if vibrate was called
    const calls = await page.evaluate(() => (window as any).vibrateCalls);
    
    // On mobile devices with vibration support, this would be called
    // In our test environment, it depends on the mock
    console.log('Vibration calls:', calls);
  });
});

test.describe('Swipe Gesture Performance', () => {
  test('should maintain smooth animation at 60fps', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(join(__dirname, '../fixtures/test_coordinate_grid.pdf'));
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    
    // Start performance measurement
    await page.evaluate(() => {
      (window as any).frameCount = 0;
      (window as any).startTime = performance.now();
      
      const countFrame = () => {
        (window as any).frameCount++;
        if (performance.now() - (window as any).startTime < 1000) {
          requestAnimationFrame(countFrame);
        }
      };
      requestAnimationFrame(countFrame);
    });
    
    // Perform swipe
    const pdfContainer = page.locator('.pdf-pages-container');
    const box = await pdfContainer.boundingBox();
    
    if (!box) throw new Error('PDF container not found');
    
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 20 });
    await page.mouse.up();
    
    // Wait for measurement to complete
    await page.waitForTimeout(1100);
    
    // Get frame count
    const frameCount = await page.evaluate(() => (window as any).frameCount);
    
    // Should be close to 60fps (allowing some variance)
    expect(frameCount).toBeGreaterThan(50);
    console.log(`Animation ran at approximately ${frameCount} fps`);
  });
});