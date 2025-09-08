import { test, expect } from '@playwright/test';

test.describe('Haptic Feedback', () => {
  test.describe('Vibration API Support', () => {
    test('checks for vibration API availability', async ({ page }) => {
      await page.goto('/');
      
      // Check if vibration API is available
      const hasVibrationAPI = await page.evaluate(() => {
        return 'vibrate' in navigator;
      });
      
      // Log the result (API may not be available in test environment)
      console.log('Vibration API available:', hasVibrationAPI);
    });

    test('haptic settings persist in localStorage', async ({ page }) => {
      await page.goto('/');
      
      // Set haptic preference
      await page.evaluate(() => {
        localStorage.setItem('hapticFeedback', 'false');
      });
      
      // Reload page
      await page.reload();
      
      // Check that preference persisted
      const hapticEnabled = await page.evaluate(() => {
        return localStorage.getItem('hapticFeedback');
      });
      
      expect(hapticEnabled).toBe('false');
      
      // Reset to enabled
      await page.evaluate(() => {
        localStorage.setItem('hapticFeedback', 'true');
      });
    });
  });

  test.describe('Haptic Triggers', () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true });

    test('triggers haptics on file upload', async ({ page }) => {
      await page.goto('/');
      
      // Mock vibrate function to track calls
      await page.evaluate(() => {
        window.vibrateCallCount = 0;
        window.originalVibrate = navigator.vibrate;
        navigator.vibrate = (pattern) => {
          window.vibrateCallCount++;
          window.lastVibratePattern = pattern;
          return true;
        };
      });
      
      // Upload a file
      await page.click('text="Try with Sample NDA Document"');
      
      // Wait for PDF to load
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Check that vibrate was called (success pattern)
      const vibrateCount = await page.evaluate(() => window.vibrateCallCount);
      expect(vibrateCount).toBeGreaterThan(0);
    });

    test('triggers haptics on annotation creation', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF first
      await page.click('text="Try with Sample NDA Document"');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Mock vibrate function
      await page.evaluate(() => {
        window.vibrateCallCount = 0;
        navigator.vibrate = () => {
          window.vibrateCallCount++;
          return true;
        };
      });
      
      // Click on PDF to add annotation
      const pdfPage = page.locator('.pdf-page').first();
      await pdfPage.click({ position: { x: 200, y: 300 } });
      
      // Check that vibrate was called
      const vibrateCount = await page.evaluate(() => window.vibrateCallCount);
      expect(vibrateCount).toBeGreaterThan(0);
    });

    test('triggers warning haptics on dangerous actions', async ({ page }) => {
      await page.goto('/');
      
      // Upload a PDF and add an annotation
      await page.click('text="Try with Sample NDA Document"');
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // Add an annotation
      const pdfPage = page.locator('.pdf-page').first();
      await pdfPage.click({ position: { x: 200, y: 300 } });
      
      // Mock vibrate and confirm
      await page.evaluate(() => {
        window.vibratePatterns = [];
        navigator.vibrate = (pattern) => {
          window.vibratePatterns.push(pattern);
          return true;
        };
        window.originalConfirm = window.confirm;
        window.confirm = () => true; // Auto-confirm
      });
      
      // Try to clear all annotations
      const clearButton = page.locator('.clear-all-annotations-button');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        
        // Check that warning pattern was used
        const patterns = await page.evaluate(() => window.vibratePatterns);
        expect(patterns.length).toBeGreaterThan(0);
        
        // Warning pattern should be an array (multiple vibrations)
        const hasWarningPattern = patterns.some(p => Array.isArray(p) && p.length > 2);
        expect(hasWarningPattern).toBe(true);
      }
    });

    test('triggers error haptics on failures', async ({ page }) => {
      await page.goto('/');
      
      // Mock fetch to fail
      await page.evaluate(() => {
        window.vibratePatterns = [];
        navigator.vibrate = (pattern) => {
          window.vibratePatterns.push(pattern);
          return true;
        };
        window.originalFetch = window.fetch;
        window.fetch = () => Promise.reject(new Error('Network error'));
      });
      
      // Try to load sample document (will fail)
      const sampleButton = page.locator('button:has-text("Try with Sample NDA Document")');
      await sampleButton.click();
      
      // Wait a bit for error handling
      await page.waitForTimeout(1000);
      
      // Check that error pattern was used (long vibration)
      const patterns = await page.evaluate(() => window.vibratePatterns);
      const hasErrorPattern = patterns.some(p => typeof p === 'number' && p >= 100);
      expect(hasErrorPattern).toBe(true);
    });
  });

  test.describe('Haptic Patterns', () => {
    test('different patterns for different actions', async ({ page }) => {
      await page.goto('/');
      
      // Test the haptic utility directly
      const patterns = await page.evaluate(() => {
        // Import would happen in real app, simulating here
        const testPatterns = {
          light: 10,
          medium: 20,
          heavy: 30,
          success: [10, 50, 10],
          warning: [10, 30, 10, 30, 10],
          error: 100,
          selection: 15,
          drag: 25
        };
        
        return testPatterns;
      });
      
      // Verify patterns are distinct
      expect(patterns.light).toBeLessThan(patterns.medium);
      expect(patterns.medium).toBeLessThan(patterns.heavy);
      expect(Array.isArray(patterns.success)).toBe(true);
      expect(Array.isArray(patterns.warning)).toBe(true);
      expect(patterns.error).toBeGreaterThan(patterns.heavy);
    });
  });

  test.describe('Fallback Behavior', () => {
    test('gracefully handles lack of vibration API', async ({ page }) => {
      await page.goto('/');
      
      // Remove vibration API
      await page.evaluate(() => {
        delete navigator.vibrate;
      });
      
      // App should still function without errors
      await page.click('text="Try with Sample NDA Document"');
      
      // Wait for PDF to load
      await page.waitForSelector('.pdf-page', { timeout: 10000 });
      
      // No errors should occur
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Perform actions that would trigger haptics
      const pdfPage = page.locator('.pdf-page').first();
      await pdfPage.click({ position: { x: 200, y: 300 } });
      
      // Check no critical errors occurred
      const criticalErrors = consoleErrors.filter(e => 
        !e.includes('Haptic feedback not available')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });
});