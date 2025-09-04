# Engineer Handoff: Draggable Annotations Feature

**GitHub Issue**: https://github.com/mattsilv/sign-pdf/issues/2  
**Priority**: P1 - High (UX blocker)  
**Estimated Effort**: 3-5 days

## The Problem (30 seconds)

Right now, when users click on an existing annotation (like a signature they just placed), the app places a DUPLICATE annotation on top instead of selecting the existing one. This is confusing - users expect to be able to click and drag annotations to reposition them, just like in Adobe Acrobat, DocuSign, or any document editor.

**Current broken flow:**
1. User places signature at position A
2. User clicks signature to adjust it
3. App places ANOTHER signature on top ❌
4. User is confused, has multiple overlapping signatures

**Expected flow:**
1. User places signature at position A  
2. User clicks signature to select it
3. Blue selection box appears ✓
4. User drags to position B
5. Signature moves to position B in both UI and export

## Quick Start (2 minutes)

```bash
# See the problem yourself:
npm run dev
# 1. Upload any PDF
# 2. Click "Signature" or "Text" tool
# 3. Click to place annotation
# 4. Click on the annotation you just placed
# 5. Notice it places another one instead of selecting!
```

## Critical Implementation Notes

### 1. Selection Before Tool
The click handler needs to check for existing annotations FIRST:
```javascript
if (clickIsOnExistingAnnotation) {
  selectIt();  // Don't place new one!
} else if (toolIsActive) {
  placeNewAnnotation();
}
```

### 2. Coordinate System (Already Fixed!)
Good news - we already fixed the hard part! The coordinate system is working perfectly:
- Use `CoordinateMapper` class as-is
- Don't add any Y-axis flips
- The coordinates from dragging can go straight to `xPdf`/`yPdf`

### 3. Visual Feedback
Industry standard selection UI:
- Blue border when selected
- 8 resize handles (corners + midpoints)
- Cursor changes to 'move' on hover
- Semi-transparent during drag

## Required E2E Test

**CRITICAL**: We need an automated test that proves dragged annotations export correctly:

```javascript
// Playwright test pseudocode
test('dragged annotation exports at new position', async () => {
  // 1. Place text "A" at coordinates (100, 400)
  // 2. Drag it to (200, 500)  
  // 3. Export PDF
  // 4. Read exported PDF with Python
  // 5. Verify "A" is at (200, 500), NOT at (100, 400)
});
```

We have test infrastructure ready:
- `coordinate_test.pdf` - Has targets at known positions
- `final_position_test.py` - Verifies export positions
- Just need to add drag simulation

## Key Files to Modify

1. **`src/components/PDFViewer.tsx`** (lines 60-113)
   - Add annotation hit detection 
   - Add selection state
   - Modify click handler

2. **`src/App.tsx`**
   - Add `selectedAnnotationId` state
   - Add `updateAnnotationPosition` handler

3. **New file: `src/components/AnnotationOverlay.tsx`**
   - Wrapper for individual annotations
   - Handles drag events
   - Shows selection box

## Don't Break What's Working!

These are already perfect - don't change:
- ✅ Coordinate conversion (`CoordinateMapper`)
- ✅ Export positioning (`export.ts`)
- ✅ PDF rendering (`viewer.ts` with `rotate: 0`)

## Success Criteria

You'll know it's working when:
1. Click existing annotation → Shows selection box (not duplicate)
2. Drag annotation → Moves smoothly
3. Export PDF → Annotation at dragged position
4. E2E test passes consistently

## Time Savers

- Start with just TEXT annotations, then expand to others
- Use `pointer-events: auto` on annotation overlays (currently 'none')
- Test with `coordinate_test.pdf` for precise verification
- Browser dev tools: Enable "Emulate touch" for testing touch events

## Questions to Consider

1. Should ESC key deselect annotation?
2. Should clicking empty space deselect?
3. Delete key to remove selected annotation?
4. Multi-select with Shift+click?

---

**Your mission**: Make annotations draggable with proper selection state, ensuring exported PDFs show them at the dragged positions. The coordinate system is already working perfectly - you just need to add the selection/drag UI layer on top!