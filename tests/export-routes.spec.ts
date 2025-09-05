import { test, expect } from '@playwright/test';

test.describe('PDF Export Routes', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Load sample document
    await page.getByText('Try with Sample NDA Document').click();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('non-e-sign compliant export (simple download)', async ({ page }) => {
    // Add a text annotation
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    
    // Wait for modal to appear and fill text
    await expect(page.locator('.text-modal')).toBeVisible();
    await page.fill('.text-input', 'Test Signature');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Ensure checkbox is NOT checked
    const checkbox = page.locator('.compliance-checkbox');
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click Download PDF button
    await page.getByText('Download PDF').first().click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify filename format (should NOT have 'signed' in it)
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/sample-nda-\d{2}-\d{2}-\d{4}\.pdf$/);
    expect(filename).not.toContain('signed');
  });

  test('e-sign compliant export (with consent modal)', async ({ page }) => {
    // Add a text annotation
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    
    // Wait for modal to appear and fill text
    await expect(page.locator('.text-modal')).toBeVisible();
    await page.fill('.text-input', 'Test Signature');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Check the e-sign compliant checkbox
    await page.locator('.compliance-checkbox').check();
    
    // Verify button text changes to "Sign & Export"
    await expect(page.getByText('Sign & Export').first()).toBeVisible();
    
    // Click Sign & Export button
    await page.getByText('Sign & Export').first().click();
    
    // Verify consent modal appears
    await expect(page.locator('.consent-modal')).toBeVisible();
    await expect(page.locator('.consent-modal h3')).toContainText('Electronic Signature Consent');
    
    // Verify modal content
    await expect(page.locator('.consent-modal')).toContainText('About to Sign: sample-nda.pdf');
    await expect(page.locator('.consent-modal')).toContainText('What we add to your PDF');
    await expect(page.locator('.consent-modal')).toContainText('Privacy Protection');
    
    // Click consent button
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('I Agree & Sign Document').click();
    
    // Wait for modal to close and download to start
    await expect(page.locator('.consent-modal')).not.toBeVisible();
    const download = await downloadPromise;
    
    // Verify filename format (should have 'signed' in it)
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/sample-nda-signed-\d{2}-\d{2}-\d{4}\.pdf$/);
    expect(filename).toContain('signed');
  });

  test('consent modal can be cancelled', async ({ page }) => {
    // Add a text annotation
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    
    // Wait for modal to appear and fill text
    await expect(page.locator('.text-modal')).toBeVisible();
    await page.fill('.text-input', 'Test Signature');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Check the e-sign compliant checkbox
    await page.locator('.compliance-checkbox').check();
    
    // Click Sign & Export button
    await page.getByText('Sign & Export').first().click();
    
    // Verify consent modal appears
    await expect(page.locator('.consent-modal')).toBeVisible();
    
    // Cancel the modal
    await page.getByText('Cancel').click();
    
    // Verify modal is closed
    await expect(page.locator('.consent-modal')).not.toBeVisible();
    
    // Verify we're still on the main page with annotations
    await expect(page.locator('.annotations-panel')).toBeVisible();
  });

  test('export buttons disabled when no annotations', async ({ page }) => {
    // Initially, the Download PDF button should be disabled
    const exportButton = page.locator('.export-button').first();
    await expect(exportButton).toBeDisabled();
    
    // Add an annotation
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    
    // Wait for modal to appear and fill text
    await expect(page.locator('.text-modal')).toBeVisible();
    await page.fill('.text-input', 'Test');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Now the button should be enabled
    await expect(exportButton).toBeEnabled();
  });

});