#!/usr/bin/env node

// Test script to verify text alignment between UI and PDF export
import { chromium } from 'playwright';

async function testTextAlignment() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Load sample document
    console.log('Loading sample document...');
    await page.click('text=Try with Sample NDA Document');
    await page.waitForTimeout(2000);
    
    // Wait for PDF to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Select text tool
    await page.click('text=Text');
    
    // Click on a specific location to add text
    console.log('Adding text annotation...');
    const canvas = await page.locator('canvas').first();
    await canvas.click({ position: { x: 300, y: 200 } });
    
    // Wait for text modal
    await page.waitForSelector('input[type="text"]');
    await page.fill('input[type="text"]', 'TEST ALIGNMENT');
    await page.click('button:has-text("Add Text")');
    
    // Take screenshot of UI
    console.log('Taking UI screenshot...');
    await page.screenshot({ path: 'tests/screenshots/ui-alignment.png', fullPage: false });
    
    // Export PDF
    console.log('Exporting PDF...');
    await page.click('text=Download PDF');
    
    console.log('Manual verification needed:');
    console.log('1. Check tests/screenshots/ui-alignment.png for UI positioning');
    console.log('2. Check exported PDF for positioning accuracy');
    console.log('3. Compare if text appears in same relative position');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testTextAlignment();