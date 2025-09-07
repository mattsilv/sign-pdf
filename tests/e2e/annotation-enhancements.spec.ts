import { test, expect } from '@playwright/test';

test.describe('Annotation Box Enhancements', () => {
  test('delete icon and numbering features', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Add first text annotation
    await page.click('button:has-text("Text")');
    const canvas = await page.locator('canvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    
    // Wait for text modal and enter text
    await page.waitForSelector('input[type="text"]');
    await page.fill('input[type="text"]', 'First Annotation');
    await page.click('button:has-text("Add Text")');
    
    // Verify first annotation has badge #1
    await expect(page.locator('div:has-text("#1")').first()).toBeVisible();
    
    // Add second annotation - checkmark
    await page.click('button:has-text("Checkmark")');
    await canvas.click({ position: { x: 300, y: 400 } });
    
    // Verify second annotation has badge #2
    await expect(page.locator('div:has-text("#2")').first()).toBeVisible();
    
    // Add third annotation - date
    await page.click('button:has-text("Date")');
    await canvas.click({ position: { x: 400, y: 500 } });
    
    // Verify third annotation has badge #3
    await expect(page.locator('div:has-text("#3")').first()).toBeVisible();
    
    // Verify annotations list shows numbers
    const annotationsList = page.locator('.annotations-panel');
    await expect(annotationsList.locator('li:has-text("#1 - Page 1")').first()).toBeVisible();
    await expect(annotationsList.locator('li:has-text("#2 - Page 1")').first()).toBeVisible();
    await expect(annotationsList.locator('li:has-text("#3 - Page 1")').first()).toBeVisible();
    
    // Test delete icon on hover
    const firstAnnotation = page.locator('.annotation-overlay').first();
    await firstAnnotation.hover();
    
    // Wait for delete icon to appear
    const deleteIcon = firstAnnotation.locator('div').filter({ 
      has: page.locator('text="×"')
    }).first();
    
    // Take screenshot with delete icon visible
    await page.screenshot({ 
      path: 'tests/screenshots/annotation-with-delete-icon.png',
      fullPage: false 
    });
    
    // Click delete icon to remove first annotation
    await deleteIcon.click();
    
    // Verify first annotation is gone but #2 and #3 remain with original numbers
    await expect(page.locator('div:has-text("#1")').first()).not.toBeVisible();
    await expect(page.locator('div:has-text("#2")').first()).toBeVisible();
    await expect(page.locator('div:has-text("#3")').first()).toBeVisible();
    
    // Verify annotations list updated
    await expect(annotationsList.locator('li:has-text("#1 - Page 1")').first()).not.toBeVisible();
    await expect(annotationsList.locator('li:has-text("#2 - Page 1")').first()).toBeVisible();
    await expect(annotationsList.locator('li:has-text("#3 - Page 1")').first()).toBeVisible();
    
    // Take final screenshot showing numbered badges
    await page.screenshot({ 
      path: 'tests/screenshots/annotation-numbered-badges.png',
      fullPage: false 
    });
  });
  
  test('delete without confirmation', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Load sample PDF
    await page.click('button:has-text("Try with Sample NDA")');
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Add an annotation
    await page.click('button:has-text("Text")');
    const canvas = await page.locator('canvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    await page.fill('input[type="text"]', 'Test Delete');
    await page.click('button:has-text("Add Text")');
    
    // Set up dialog handler to fail test if confirmation appears
    let dialogAppeared = false;
    page.on('dialog', () => {
      dialogAppeared = true;
    });
    
    // Hover and delete
    const annotation = page.locator('.annotation-overlay').first();
    await annotation.hover();
    const deleteIcon = annotation.locator('div').filter({ 
      has: page.locator('text="×"')
    }).first();
    await deleteIcon.click();
    
    // Verify no dialog appeared and annotation is deleted
    expect(dialogAppeared).toBe(false);
    await expect(page.locator('.annotation-overlay')).not.toBeVisible();
  });
});