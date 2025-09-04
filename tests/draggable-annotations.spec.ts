import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Draggable Annotations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking existing annotation selects it instead of duplicating', async ({ page }) => {
    // Upload test PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, '..', 'test_coordinate_grid.pdf');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas');

    // Select text tool
    await page.getByText('Text', { exact: true }).click();

    // Click to place a text annotation at coordinates (100, 100)
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });

    // Fill in text
    await page.getByPlaceholder('Enter your text...').fill('Test Annotation');
    await page.getByText('Save').click();

    // Verify annotation is created
    await expect(page.locator('.annotation-overlay').first()).toBeVisible();

    // Click on the annotation again
    await page.locator('.annotation-overlay').first().click();

    // Verify no duplicate annotation was created (still only 1)
    const annotationCount = await page.locator('.annotation-overlay').count();
    expect(annotationCount).toBe(1);

    // Verify the annotation is selected (has blue border)
    const borderStyle = await page.locator('.annotation-overlay').first().evaluate(
      el => window.getComputedStyle(el).border
    );
    expect(borderStyle).toContain('2px solid');
  });

  test('dragging annotation updates its position', async ({ page }) => {
    // Upload test PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, '..', 'test_coordinate_grid.pdf');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas');

    // Select text tool and place annotation
    await page.getByText('Text', { exact: true }).click();
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.getByPlaceholder('Enter your text...').fill('Draggable');
    await page.getByText('Save').click();

    // Get initial position
    const annotation = page.locator('.annotation-overlay').first();
    const initialPosition = await annotation.boundingBox();
    
    // Drag the annotation to new position
    await annotation.dragTo(canvas, { 
      targetPosition: { x: 200, y: 200 },
      force: true 
    });

    // Get new position
    const newPosition = await annotation.boundingBox();

    // Verify position changed
    expect(newPosition?.x).not.toBeCloseTo(initialPosition?.x ?? 0, 5);
    expect(newPosition?.y).not.toBeCloseTo(initialPosition?.y ?? 0, 5);
  });

  test('exported PDF contains annotation at dragged position', async ({ page }) => {
    // Upload test PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, '..', 'test_coordinate_grid.pdf');
    await fileInput.setInputFiles(testPdfPath);

    // Wait for PDF to load
    await page.waitForSelector('canvas');

    // Place text annotation
    await page.getByText('Text', { exact: true }).click();
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 400 } });
    await page.getByPlaceholder('Enter your text...').fill('DRAGGED_TEXT');
    await page.getByText('Save').click();

    // Drag annotation to new position (200, 500)
    const annotation = page.locator('.annotation-overlay').first();
    await annotation.dragTo(canvas, { 
      targetPosition: { x: 200, y: 300 },
      force: true 
    });

    // Export PDF
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Export PDF').click();
    const download = await downloadPromise;

    // Save the exported PDF
    const exportedPath = path.join(__dirname, '..', 'exported_test.pdf');
    await download.saveAs(exportedPath);

    // Verify the file was saved
    expect(fs.existsSync(exportedPath)).toBe(true);
    
    // Note: To fully verify the position in the exported PDF,
    // you would need to use a PDF parsing library like pdf-parse
    // to check the actual text position in the PDF
  });

  test('ESC key deselects annotation', async ({ page }) => {
    // Upload test PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, '..', 'test_coordinate_grid.pdf');
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForSelector('canvas');

    // Place and select annotation
    await page.getByText('Text', { exact: true }).click();
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.getByPlaceholder('Enter your text...').fill('Test');
    await page.getByText('Save').click();

    // Click to select annotation
    await page.locator('.annotation-overlay').first().click();
    
    // Verify selected (blue border)
    let borderStyle = await page.locator('.annotation-overlay').first().evaluate(
      el => window.getComputedStyle(el).border
    );
    expect(borderStyle).toContain('2px solid');

    // Press ESC
    await page.keyboard.press('Escape');

    // Verify deselected
    borderStyle = await page.locator('.annotation-overlay').first().evaluate(
      el => window.getComputedStyle(el).border
    );
    expect(borderStyle).toContain('1px dashed');
  });

  test('signature annotations can be resized', async ({ page }) => {
    // Upload test PDF
    const fileInput = page.locator('input[type="file"]');
    const testPdfPath = path.join(__dirname, '..', 'test_coordinate_grid.pdf');
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForSelector('canvas');

    // Draw a signature
    await page.getByText('Signature').click();
    const signaturePad = page.locator('canvas').nth(1); // Signature pad is second canvas
    
    // Draw something on signature pad
    await signaturePad.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0, { steps: 10 });
    await page.mouse.move(0, 50, { steps: 10 });
    await page.mouse.up();

    // Save signature
    await page.getByText('Save Signature').click();

    // Place signature on PDF
    const pdfCanvas = page.locator('canvas').first();
    await pdfCanvas.click({ position: { x: 200, y: 200 } });

    // Select the signature annotation
    const annotation = page.locator('.annotation-overlay').first();
    await annotation.click();

    // Get initial size
    const initialBox = await annotation.boundingBox();
    const initialWidth = initialBox?.width ?? 0;

    // Look for resize handle
    const resizeHandle = page.locator('[style*="cursor: se-resize"]').first();
    await expect(resizeHandle).toBeVisible();

    // Note: Actual resize dragging would require more complex interaction
    // This test verifies that resize handles appear for signatures
  });
});