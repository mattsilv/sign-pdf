# Critical PDF Annotation Positioning Bug - Investigation Guide

**GitHub Issue**: [mattsilv/sign-pdf#1](https://github.com/mattsilv/sign-pdf/issues/1)

## 🚨 Issue Summary
PDF annotations (signatures, text, etc.) appear in completely different locations between:
1. **UI Preview** (where user sees them while editing)  
2. **Exported PDF** (final document output)

This breaks the core WYSIWYG functionality and makes the application unusable.

## 🎯 Quick Start for New Engineers

### Prerequisites
```bash
# Clone and setup
git clone https://github.com/mattsilv/sign-pdf.git
cd sign-pdf
npm install
npm run dev

# Install Python testing tools
uv pip install reportlab
```

### Immediate Test Steps
1. **Generate coordinate test PDF**:
   ```bash
   python3 create_test_pdf.py
   # Creates: coordinate_test.pdf with grid references
   ```

2. **Load test PDF in application** (http://localhost:3000)
   - Upload `coordinate_test.pdf` 
   - Click exactly on red "Target A" bullseye at coordinates (100, 400)
   - Check browser console for debug output

3. **Analyze coordinate conversion**:
   ```javascript
   // Current debug output in console:
   Raw PDF.js conversion result: ??? // <-- What format is this?
   Coordinate mapping: { clickX: 100, clickY: 300, pdfX: ??, pdfY: ?? }
   ```

## 🔧 AI Agent Testing Strategy

### Playwright MCP Integration
**IMPORTANT**: This issue should leverage Playwright MCP for automated visual feedback loops.

AI coding agents can:
1. **Make coordinate fixes** in the code
2. **Run Playwright tests** to click specific coordinates  
3. **Take screenshots** of results
4. **Compare expected vs actual** positioning
5. **Iterate automatically** until pixel-perfect

Example Playwright test flow:
```javascript
// Pseudocode for AI agent testing
await page.goto('http://localhost:3000');
await page.setInputFiles('input[type="file"]', './coordinate_test.pdf');
await page.click('[data-testid="signature-tool"]');
await page.click('canvas', { position: { x: 100, y: 400 } }); // Target A
const screenshot = await page.screenshot();
// AI agent analyzes screenshot for signature position accuracy
```

This creates a **visual feedback loop** where AI agents can see the actual results of their coordinate fixes.

## 📊 Test PDF Reference

**Path**: `/Users/m/gh/sign/coordinate_test.pdf`

### Grid Layout:
- **Coordinate System**: PDF standard (0,0 at bottom-left)
- **Page Size**: 8.5" × 11" (612 × 792 points)
- **Grid Lines**: Major every 1" (72 points), Minor every 0.5"
- **Test Targets**:
  - Target A: (100, 400) 
  - Target B: (200, 500)
  - Target C: (400, 300)
  - Target D: (500, 600)

### Standard Print Margins:
- Top: 1" (72 points)
- Bottom: 1" (72 points) 
- Left: 1" (72 points)
- Right: 1" (72 points)

## 🔍 Investigation Areas

### 1. PDF.js Coordinate Conversion
**Files**: `src/lib/pdf/coordinates.ts`, `src/components/PDFViewer.tsx`

**Key Question**: What does `viewport.convertToPdfPoint(x, y)` actually return?
- Array `[x, y]`?
- Object `{x, y}`? 
- Something else?

### 2. Canvas Setup & HiDPI
**Files**: `src/lib/pdf/viewer.ts`

**Key Question**: Is canvas scaling affecting coordinate calculations?
```javascript
// Current setup in viewer.ts
const outputScale = window.devicePixelRatio || 1;
canvas.width = Math.floor(viewport.width * outputScale);
canvas.height = Math.floor(viewport.height * outputScale);
```

### 3. PDF Export Coordinate System
**Files**: `src/lib/pdf/export.ts`

**Key Question**: Does PDF-lib use the same coordinate system as stored values?
```javascript
// Current export in export.ts
page.drawImage(png, {
  x: item.xPdf,  // Are these the right coordinates?
  y: item.yPdf,  // Is this the same coordinate system?
  width: item.widthPdf || 100,
  height: item.heightPdf || 50,
});
```

## 🤖 AI Agent Guidelines

### When to Pause and Ask for Best Practices
AI agents should **STOP and ask the user** before:

1. **Changing core coordinate system logic** 
   - "Should I modify the coordinate conversion approach in coordinates.ts?"
   
2. **Altering PDF.js canvas setup**
   - "Should I change the HiDPI scaling or viewport setup in viewer.ts?"
   
3. **Modifying PDF export positioning**
   - "Should I adjust how PDF-lib positions elements in export.ts?"

4. **Adding new dependencies or major architecture changes**
   - "Should I add a coordinate transformation library or change the rendering pipeline?"

### Investigation Protocol
1. **Data Collection First**: Always gather coordinate conversion debug data before making changes
2. **Test with Grid PDF**: Use coordinate_test.pdf for all position testing
3. **Visual Verification**: Use Playwright MCP to take screenshots and verify results
4. **Incremental Changes**: Make small, targeted fixes and test immediately
5. **Document Findings**: Update this document with discoveries

## 🎯 Success Criteria
- [ ] Signature appears exactly at clicked location in preview
- [ ] Exported PDF has signature in identical position as preview  
- [ ] Works across all zoom levels (50%-300%)
- [ ] Works on both standard and HiDPI displays
- [ ] Playwright tests pass with pixel-perfect accuracy

## 📚 Resources
- [PDF.js Coordinate Examples](https://github.com/mozilla/pdf.js/tree/master/examples)
- [PDF-lib Documentation](https://pdf-lib.js.org/)
- Current codebase coordinate files:
  - `src/lib/pdf/coordinates.ts`
  - `src/components/PDFViewer.tsx` 
  - `src/lib/pdf/viewer.ts`
  - `src/lib/pdf/export.ts`

## 🚀 Quick Debug Commands
```bash
# Start dev server
npm run dev

# Generate fresh test PDF
python3 create_test_pdf.py

# Check current coordinate debug output
# 1. Load coordinate_test.pdf in browser
# 2. Open DevTools Console  
# 3. Click Target A
# 4. Analyze console.log output
```

---
**Priority**: P0 Critical - Application unusable until fixed
**Estimated Effort**: 1-2 days with systematic debugging approach