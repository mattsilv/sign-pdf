# Manual Alignment Test Instructions

## Test the Current Alignment System

1. **Start the app**:
   ```bash
   npm run dev
   ```
   Navigate to http://localhost:5175

2. **Load sample document**:
   - Click "Try with Sample NDA Document"
   - Wait for document to fully load

3. **Create a signature**:
   - Click "Typed" button
   - Enter "John Smith" 
   - Click "Use This Signature"

4. **Place signature at specific location**:
   - Click "Signature" tool button
   - Click at a memorable location on the page (e.g., below a specific paragraph)
   - Take a screenshot of the placement

5. **Export and compare**:
   - Click "Export PDF"
   - Open the exported PDF
   - Compare the signature position with the WYSIWYG view

## What to Look For

The signature should appear in the EXACT same position relative to the text in both:
- The WYSIWYG editor view
- The exported PDF

## Current Status

With the centralized geometry system implemented, the alignment should now be precise. The system uses:

- **Centralized coordinate conversion** in `src/lib/pdf/geometry.ts`
- **Consistent anchor positioning** for all annotation types
- **Proper bounds checking** to prevent out-of-page placement
- **Zoom-invariant coordinates** that remain stable across all zoom levels

## Testing Different Scenarios

Try these tests to verify alignment:

1. **Different zoom levels**: Place signatures at 50%, 75%, 100%, 125% zoom
2. **Different positions**: Top, middle, bottom of page
3. **Multiple annotations**: Add several signatures and text annotations
4. **Drag operations**: Place then drag annotations to new positions

All should maintain perfect alignment between WYSIWYG and export.