import { test, expect } from '@playwright/test';

test.describe('Signature Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
    // Load sample document
    await page.getByRole('button', { name: 'Try with Sample NDA Document' }).click();
    await expect(page.getByText('Tools')).toBeVisible();
  });

  test('typed signature end-to-end workflow', async ({ page }) => {
    console.log('🧪 Starting typed signature workflow test');
    
    // Step 1: Create typed signature
    await page.getByRole('button', { name: '✍️ Signature' }).click();
    await expect(page.getByRole('heading', { name: 'Create Your Signature' })).toBeVisible();
    
    // Switch to type mode
    await page.getByRole('radio', { name: '⌨️ Type Signature' }).click();
    await expect(page.getByRole('radio', { name: '⌨️ Type Signature' })).toBeChecked();
    
    // Type signature
    const signatureName = 'Jane Doe';
    await page.getByRole('textbox', { name: 'Type your signature here' }).fill(signatureName);
    
    // Save signature
    await expect(page.getByRole('button', { name: 'Save Signature' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save Signature' }).click();
    
    // Step 2: Verify Edit button appears and persistence works
    await expect(page.getByRole('button', { name: '✎️ Edit Signature' })).toBeVisible();
    
    // Test edit functionality
    await page.getByRole('button', { name: '✎️ Edit Signature' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Your Signature' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Type your signature here' })).toHaveValue(signatureName);
    await expect(page.locator('.storage-status')).toContainText('Saved in browser');
    
    // Close modal
    await page.getByRole('button', { name: '×' }).click();
    
    // Step 3: Verify signature is ready for placement
    await expect(page.getByText('Click into your PDF below to add your signature')).toBeVisible();
    
    console.log('✅ Typed signature workflow test completed');
  });

  test('drawn signature end-to-end workflow', async ({ page }) => {
    console.log('🧪 Starting drawn signature workflow test');
    
    // Step 1: Create drawn signature
    await page.getByRole('button', { name: '✍️ Signature' }).click();
    await expect(page.getByRole('heading', { name: 'Create Your Signature' })).toBeVisible();
    
    // Verify draw mode is default
    await expect(page.getByRole('radio', { name: '✏️ Draw Signature' })).toBeChecked();
    
    // Draw on canvas
    const canvas = page.locator('.signature-canvas');
    await expect(canvas).toBeVisible();
    
    // Simple draw interaction
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 100);
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 120);
      await page.mouse.up();
    }
    
    // Save signature
    await page.waitForTimeout(500); // Give time for canvas to update
    await expect(page.getByRole('button', { name: 'Save Signature' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save Signature' }).click();
    
    // Step 2: Verify Edit button appears
    await expect(page.getByRole('button', { name: '✎️ Edit Signature' })).toBeVisible();
    
    // Test edit functionality
    await page.getByRole('button', { name: '✎️ Edit Signature' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Your Signature' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '✏️ Draw Signature' })).toBeChecked();
    await expect(page.locator('.storage-status')).toContainText('Saved in browser');
    
    // Test clear functionality - use the signature clear button, not storage clear
    await page.locator('.signature-modal-actions button:has-text("Clear")').click();
    await expect(page.getByRole('button', { name: 'Save Signature' })).toBeDisabled();
    
    // Close modal
    await page.getByRole('button', { name: '×' }).click();
    
    console.log('✅ Drawn signature workflow test completed');
  });

  test('signature mode switching and unsaved changes', async ({ page }) => {
    console.log('🧪 Starting mode switching test');
    
    await page.getByRole('button', { name: '✍️ Signature' }).click();
    
    // Type some text
    await page.getByRole('radio', { name: '⌨️ Type Signature' }).click();
    await page.getByRole('textbox', { name: 'Type your signature here' }).fill('Test Name');
    
    // Try to switch modes - should show confirmation
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Switching modes will clear your current signature');
      await dialog.accept();
    });
    
    await page.getByRole('radio', { name: '✏️ Draw Signature' }).click();
    
    // Should now be in draw mode with empty canvas
    await expect(page.getByRole('radio', { name: '✏️ Draw Signature' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Save Signature' })).toBeDisabled();
    
    console.log('✅ Mode switching test completed');
  });

  test('unsaved changes confirmation on close', async ({ page }) => {
    console.log('🧪 Starting unsaved changes test');
    
    await page.getByRole('button', { name: '✍️ Signature' }).click();
    
    // Type some text but don't save
    await page.getByRole('radio', { name: '⌨️ Type Signature' }).click();
    await page.getByRole('textbox', { name: 'Type your signature here' }).fill('Unsaved Name');
    
    // Try to close - should show confirmation
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('You have an unsaved signature');
      await dialog.dismiss();
    });
    
    await page.getByRole('button', { name: '×' }).click();
    
    // Modal should still be open
    await expect(page.getByRole('heading', { name: 'Create Your Signature' })).toBeVisible();
    
    console.log('✅ Unsaved changes test completed');
  });

  test('storage clear functionality', async ({ page }) => {
    console.log('🧪 Starting storage clear test');
    
    // Create and save signature
    await page.getByRole('button', { name: '✍️ Signature' }).click();
    await page.getByRole('radio', { name: '⌨️ Type Signature' }).click();
    await page.getByRole('textbox', { name: 'Type your signature here' }).fill('Storage Test');
    await page.getByRole('button', { name: 'Save Signature' }).click();
    
    // Edit to see storage indicator
    await page.getByRole('button', { name: '✎️ Edit Signature' }).click();
    await expect(page.locator('.storage-status')).toContainText('Saved in browser');
    
    // Clear storage
    await page.locator('.clear-storage-link').click();
    await expect(page.locator('.storage-indicator')).not.toBeVisible();
    
    console.log('✅ Storage clear test completed');
  });

  test('UI elements and icons are present', async ({ page }) => {
    console.log('🧪 Starting UI elements test');
    
    // Verify Export PDF button has icon (when annotations exist)
    await page.getByRole('button', { name: '✍️ Signature' }).click();
    await page.getByRole('radio', { name: '⌨️ Type Signature' }).click();
    await page.getByRole('textbox', { name: 'Type your signature here' }).fill('Test');
    await page.getByRole('button', { name: 'Save Signature' }).click();
    
    // Verify Start Over button has icon
    const startOverButton = page.getByRole('button', { name: 'Start Over' });
    await expect(startOverButton).toBeVisible();
    await expect(startOverButton.locator('svg')).toBeVisible();
    
    console.log('✅ UI elements test completed');
  });
});