import { test, expect } from '@playwright/test';

test.describe('Legal Compliance Features', () => {
  
  test('displays legal compliance information in header', async ({ page }) => {
    await page.goto('/');
    
    // Check for ESIGN/UETA compliance badge
    await expect(page.locator('.compliance-badge')).toContainText('🔒 ESIGN Act & UETA Compliant');
    
    // Check for compliance text
    await expect(page.locator('.compliance-text')).toContainText('forensic documentation');
    
    // Check for legal disclaimer
    await expect(page.locator('.legal-disclaimer')).toContainText('Not legal advice');
    await expect(page.locator('.legal-disclaimer')).toContainText('Consult with an attorney');
  });

  test('shows consent modal before signing', async ({ page }) => {
    await page.goto('/');
    
    // Load sample document
    await page.getByText('Try with Sample NDA Document').click();
    await expect(page.locator('canvas')).toBeVisible();
    
    // Add a text annotation
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    await page.fill('.text-input', 'Test Signature');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Try to export - should show consent modal
    await page.getByText('Sign & Export PDF').first().click();
    
    // Verify consent modal is displayed
    await expect(page.locator('.consent-modal')).toBeVisible();
    await expect(page.locator('.consent-modal h3')).toContainText('Electronic Signature Consent');
    
    // Check consent modal content sections
    await expect(page.locator('.consent-modal')).toContainText('About to Sign');
    await expect(page.locator('.consent-modal')).toContainText('Legal Compliance');
    await expect(page.locator('.consent-modal')).toContainText('ESIGN Act');
    await expect(page.locator('.consent-modal')).toContainText('UETA');
    await expect(page.locator('.consent-modal')).toContainText('Forensic Documentation');
    await expect(page.locator('.consent-modal')).toContainText('Privacy Protection');
    
    // Check legal disclaimer in modal
    await expect(page.locator('.modal-legal-disclaimer')).toContainText('This is not legal advice');
    await expect(page.locator('.modal-legal-disclaimer')).toContainText('consult with a qualified attorney');
    
    // Check that consent button is disabled initially
    await expect(page.locator('.consent-button')).toBeDisabled();
    
    // Enable consent checkbox
    await page.locator('.consent-checkbox input[type="checkbox"]').check();
    
    // Now consent button should be enabled
    await expect(page.locator('.consent-button')).toBeEnabled();
    
    // Cancel without consenting
    await page.getByText('Cancel').click();
    await expect(page.locator('.consent-modal')).not.toBeVisible();
  });

  test('consent checkbox must be checked to proceed', async ({ page }) => {
    await page.goto('/');
    
    // Load sample and add annotation quickly
    await page.getByText('Try with Sample NDA Document').click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    await page.fill('.text-input', 'Test');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Open consent modal
    await page.getByText('Sign & Export PDF').first().click();
    await expect(page.locator('.consent-modal')).toBeVisible();
    
    // Verify button is disabled without consent
    await expect(page.locator('.consent-button')).toBeDisabled();
    
    // Check the consent checkbox
    await page.locator('.consent-checkbox input[type="checkbox"]').check();
    
    // Now button should be enabled
    await expect(page.locator('.consent-button')).toBeEnabled();
    
    // Uncheck - button should be disabled again
    await page.locator('.consent-checkbox input[type="checkbox"]').uncheck();
    await expect(page.locator('.consent-button')).toBeDisabled();
  });

  test('button text reflects signing workflow', async ({ page }) => {
    await page.goto('/');
    
    // Load sample document
    await page.getByText('Try with Sample NDA Document').click();
    await expect(page.locator('canvas')).toBeVisible();
    
    // Check that export buttons show "Sign & Export PDF" text
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    await page.fill('.text-input', 'Test');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Check both export buttons have the new text
    await expect(page.locator('.export-button').first()).toContainText('Sign & Export PDF');
    await expect(page.getByText('Sign & Export PDF').first()).toBeVisible();
  });

  test('consent modal includes privacy messaging', async ({ page }) => {
    await page.goto('/');
    
    // Quick setup
    await page.getByText('Try with Sample NDA Document').click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    await page.fill('.text-input', 'Test');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Open consent modal
    await page.getByText('Sign & Export PDF').first().click();
    
    // Verify privacy messaging
    await expect(page.locator('.consent-modal')).toContainText('Privacy Protection');
    await expect(page.locator('.consent-modal')).toContainText('All processing happens locally in your browser');
    await expect(page.locator('.consent-modal')).toContainText('No data is sent to or stored on our servers');
    await expect(page.locator('.consent-modal')).toContainText('Forensic information is embedded in your PDF only');
    
    // Check consent agreement text
    await expect(page.locator('.consent-text')).toContainText('All processing occurs locally in my browser for privacy protection');
  });

  test('modal can be closed with escape key', async ({ page }) => {
    await page.goto('/');
    
    // Quick setup
    await page.getByText('Try with Sample NDA Document').click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.getByText('Text', { exact: true }).click();
    await page.locator('canvas').click({ position: { x: 200, y: 300 } });
    await page.fill('.text-input', 'Test');
    await page.getByRole('button', { name: 'Add Text' }).click();
    
    // Open consent modal
    await page.getByText('Sign & Export PDF').first().click();
    await expect(page.locator('.consent-modal')).toBeVisible();
    
    // Focus the modal and close with escape key
    await page.locator('.consent-modal').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.consent-modal')).not.toBeVisible();
  });

});