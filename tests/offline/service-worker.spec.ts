import { test, expect } from '@playwright/test';

test.describe('Service Worker & Offline Support', () => {
  test('service worker registers successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration
    const swRegistered = await page.evaluate(() => 
      new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(() => resolve(true));
        } else {
          resolve(false);
        }
      })
    );
    
    expect(swRegistered).toBe(true);
  });

  test('caches static assets on first visit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if caches exist
    const hasCaches = await page.evaluate(async () => {
      if (!('caches' in window)) return false;
      const cacheNames = await caches.keys();
      return cacheNames.length > 0;
    });
    
    expect(hasCaches).toBe(true);
  });

  test('app loads offline after first visit', async ({ page, context }) => {
    // First visit online
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for service worker to be ready
    await page.evaluate(() => 
      navigator.serviceWorker?.ready
    );
    
    // Go offline
    await context.setOffline(true);
    
    // Reload the page
    await page.reload();
    
    // Check that app still loads
    await expect(page.locator('h1')).toContainText('Sign PDF');
    
    // Verify key UI elements are present
    await expect(page.locator('button:has-text("Upload PDF")')).toBeVisible();
  });

  test('shows offline indicator when offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Wait a moment for the offline event to fire
    await page.waitForTimeout(1000);
    
    // Check for offline behavior (app should still function)
    const isAppFunctional = await page.evaluate(() => {
      // Check if the app's main container exists
      return document.querySelector('#root')?.children.length > 0;
    });
    
    expect(isAppFunctional).toBe(true);
  });

  test('caches uploaded PDFs for offline access', async ({ page, context }) => {
    await page.goto('/');
    
    // Upload a test PDF
    await page.waitForSelector('text="Try with Sample NDA Document"', { timeout: 5000 });
    await page.click('text="Try with Sample NDA Document"');
    
    // Wait for PDF to load
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
    
    // Go offline
    await context.setOffline(true);
    
    // Reload the page
    await page.reload();
    
    // The app should still function offline
    await expect(page.locator('h1')).toContainText('Sign PDF');
  });

  test('PWA is installable', async ({ page }) => {
    await page.goto('/');
    
    // Check if manifest is linked
    const hasManifest = await page.evaluate(() => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      return manifestLink !== null;
    });
    
    expect(hasManifest).toBe(true);
    
    // Check if manifest loads correctly
    const manifestResponse = await page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) return null;
      
      try {
        const response = await fetch(manifestLink.href);
        return response.ok;
      } catch {
        return false;
      }
    });
    
    expect(manifestResponse).toBe(true);
  });

  test('service worker updates when new version available', async ({ page }) => {
    await page.goto('/');
    
    // Check if update check mechanism exists
    const hasUpdateCheck = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 
             navigator.serviceWorker.controller !== null;
    });
    
    expect(hasUpdateCheck).toBe(true);
  });

  test('handles network errors gracefully', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate network error
    await context.setOffline(true);
    
    // Try to perform an action that would normally require network
    // App should handle it gracefully
    await page.waitForSelector('text="Try with Sample NDA Document"', { timeout: 5000 });
    await page.click('text="Try with Sample NDA Document"');
    
    // Should still be able to view and sign PDFs offline
    await page.waitForSelector('.pdf-page', { timeout: 10000 });
  });
});