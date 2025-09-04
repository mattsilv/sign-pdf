# Feature: Draggable Annotations with E2E Position Verification

## Summary
Implement drag-and-drop functionality for all annotations (text, signatures, checkmarks, dates) after placement, with comprehensive end-to-end testing to ensure WYSIWYG accuracy is maintained after dragging.

## Problem Statement
Currently, once an annotation is placed on the PDF, it cannot be repositioned. Users must delete and re-add annotations if they're not satisfied with the placement. This impacts user experience, especially when signing multiple fields or adjusting layouts.

**Critical UX Issue**: When users click on an existing annotation (expecting to select/drag it), the app instead places a duplicate annotation on top. This is confusing and not standard behavior for document editing tools.

## Proposed Solution

### 1. Click Behavior Changes
**Primary Change**: Clicking on an existing annotation should SELECT it, not place a new one.

```typescript
// Click handler logic:
const handleCanvasClick = (event) => {
  const clickPoint = { x: event.clientX, y: event.clientY };
  
  // FIRST: Check if click is on an existing annotation
  const clickedAnnotation = findAnnotationAtPoint(clickPoint);
  
  if (clickedAnnotation) {
    // SELECT the annotation (don't place new one)
    setSelectedAnnotation(clickedAnnotation.id);
    enterDragMode(clickedAnnotation);
    return;
  }
  
  // ONLY if clicking empty space: place new annotation
  if (selectedTool && !clickedAnnotation) {
    placeNewAnnotation(clickPoint);
  }
};
```

### 2. Selection State & Visual Indicators
- **Selection box**: Blue border with corner handles (standard UI pattern)
- **Hover state**: Subtle highlight + move cursor
- **Selected state**: Visible border with 8 resize handles (corners + midpoints)
- **Dragging state**: Semi-transparent original + live preview
- Consider color: Blue for selected (industry standard)

### 3. Drag Implementation

#### Mouse/Touch Events
```typescript
// Annotation component should handle:
- onMouseDown/onTouchStart: Begin drag, store offset
- onMouseMove/onTouchMove: Update position in real-time
- onMouseUp/onTouchEnd: Finalize position, update state

// Store drag state:
interface DragState {
  isDragging: boolean;
  annotationId: string;
  startX: number;
  startY: number;
  offsetX: number;  // Click offset from annotation origin
  offsetY: number;
}
```

#### Position Updates
- Update annotation's `xPdf` and `yPdf` coordinates during drag
- Use `CoordinateMapper` to convert mouse position to PDF coordinates
- Maintain the same coordinate system consistency we just fixed
- Real-time preview during dragging

### 3. State Management
```typescript
// Update annotation position in state
const handleDragEnd = (annotationId: string, newX: number, newY: number) => {
  // Convert canvas coordinates to PDF coordinates
  const [xPdf, yPdf] = mapper.toPdfPoint(newX, newY);
  
  // Update annotation
  setAnnotations(prev => prev.map(ann => 
    ann.id === annotationId 
      ? { ...ann, xPdf, yPdf }
      : ann
  ));
};
```

### 4. Critical Coordinate Handling
**IMPORTANT**: Maintain our fixed coordinate system:
- Use the same `CoordinateMapper` class
- Don't add any Y-axis flips or custom transformations
- Account for annotation anchor points:
  - Text: baseline positioning
  - Signatures/checkmarks: centered on position
  - Remember the centering offsets we use

### 5. UI/UX Considerations
- Prevent dragging outside PDF bounds
- Snap-to-grid option (future enhancement)
- Visual feedback during drag (opacity change, shadow)
- Undo/redo support (future enhancement)

## End-to-End Testing Requirements

### Test Framework Setup
Use Playwright with visual regression testing:

```javascript
// test/e2e/draggable-annotations.spec.js
import { test, expect } from '@playwright/test';

test.describe('Draggable Annotations E2E', () => {
  test('Text annotation maintains position after drag', async ({ page }) => {
    // 1. Load coordinate test PDF
    // 2. Place text at Target A (100, 400)
    // 3. Drag to Target B (200, 500)
    // 4. Export PDF
    // 5. Verify text appears at Target B in export
  });
  
  test('Signature maintains position after drag', async ({ page }) => {
    // Similar test for signatures with centering verification
  });
});
```

### Automated Position Verification

```python
# test/verify_drag_positions.py
def verify_drag_export(pdf_path, expected_positions):
    """
    Verify annotations appear at expected positions after drag
    
    Args:
        pdf_path: Exported PDF to verify
        expected_positions: Dict of annotation text -> (x, y) coordinates
    
    Returns:
        bool: True if all positions match within tolerance
    """
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    for text, (expected_x, expected_y) in expected_positions.items():
        actual_pos = find_text_position(page, text)
        error = calculate_position_error(actual_pos, (expected_x, expected_y))
        
        if error > TOLERANCE:
            return False
    
    return True
```

### Test Scenarios

1. **Basic Drag Test**
   - Place annotation at position A
   - Drag to position B
   - Verify UI shows at B
   - Export and verify PDF shows at B

2. **Multi-Annotation Drag**
   - Place multiple annotations
   - Drag each to new positions
   - Verify none interfere with each other
   - Export and verify all positions correct

3. **Edge Cases**
   - Drag to PDF boundaries
   - Drag with zoom at different levels (50%, 100%, 200%)
   - Drag on multi-page documents
   - Drag after page navigation

4. **Visual Regression Tests**
   ```javascript
   // Compare screenshots before and after drag
   await expect(page).toHaveScreenshot('after-drag.png', {
     clip: { x: 100, y: 400, width: 200, height: 100 },
     maxDiffPixels: 100
   });
   ```

### Success Criteria
- [ ] All annotation types are draggable
- [ ] Drag preview shows in real-time
- [ ] Released position matches preview exactly
- [ ] Exported PDF shows annotation at dragged position
- [ ] Position accuracy within 2 pixels tolerance
- [ ] Works at all zoom levels
- [ ] No position drift after multiple drags
- [ ] E2E tests pass with 100% reliability

## Implementation Steps

1. **Add drag event handlers to annotation overlays**
   - Modify `PDFViewer.tsx` annotation rendering
   - Add mouse/touch event listeners
   - Track drag state

2. **Update coordinate conversion during drag**
   - Use existing `CoordinateMapper`
   - Calculate new PDF coordinates on mouse move
   - Update annotation position in state

3. **Ensure export uses updated positions**
   - Verify `export.ts` uses latest annotation positions
   - No additional changes needed if state is correct

4. **Create E2E test suite**
   - Set up Playwright tests
   - Add coordinate verification script
   - Create visual regression tests
   - Add to CI pipeline

## Technical Considerations

### Performance
- Throttle mousemove events during drag
- Use React.memo for annotation components
- Consider using transform for drag preview (GPU accelerated)

### Accessibility
- Keyboard support for moving annotations (arrow keys)
- Screen reader announcements for position changes
- Focus management during drag operations

### Mobile Support
- Touch event handling
- Prevent scroll during drag
- Handle touch cancel events

## Testing Checklist

- [ ] Unit tests for drag coordinate calculations
- [ ] Integration tests for state updates
- [ ] E2E test: Single annotation drag
- [ ] E2E test: Multiple annotations drag
- [ ] E2E test: Drag at different zoom levels
- [ ] E2E test: Drag on different page sizes
- [ ] Visual regression tests
- [ ] Performance tests (drag 50+ annotations)
- [ ] Mobile device testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

## Definition of Done

1. All annotations can be dragged to new positions
2. Drag is smooth with visual feedback
3. Export maintains exact dragged positions
4. All E2E tests pass consistently
5. No regression in existing WYSIWYG accuracy
6. Documentation updated with drag feature
7. Performance remains acceptable (60fps during drag)

## Related Issues
- #1 - Critical Bug - PDF Signature Positioning Issue (FIXED)

## References
- Current coordinate system implementation: `/src/lib/pdf/coordinates.ts`
- Annotation rendering: `/src/components/PDFViewer.tsx`
- Export logic: `/src/lib/pdf/export.ts`

---

**Priority**: P1 - High
**Estimated Effort**: 3-5 days
**Labels**: `enhancement`, `testing-required`, `wysiwyg`