# PDF Signer - Privacy First

A client-side PDF signing application built with modern web technologies. Sign PDFs with complete privacy - all processing happens in your browser, no data leaves your device.

## ✨ Features

- **Privacy-First**: All PDF processing happens locally in your browser
- **Multiple Annotation Types**: Text, signatures, checkmarks, and dates
- **WYSIWYG Editing**: What you see is exactly what gets exported - pixel-perfect positioning
- **Smooth Dragging**: Real-time annotation movement with zero lag
- **Cross-Platform**: Works on desktop and mobile browsers
- **Modern Export**: Uses File System Access API with graceful fallbacks

## 🎯 Key Technical Achievements

### Perfect Coordinate Accuracy
This application solves common PDF annotation positioning issues:

- **Exact positioning**: Annotations appear in exported PDFs exactly where placed in the UI
- **No position drift**: Fixed the common PDF.js bug where exports don't match preview
- **Coordinate transformation**: Properly handles PDF (bottom-left origin) vs Canvas (top-left origin) systems

### Performance Optimizations

**Smooth Dragging with CSS Transforms**
- Uses CSS transforms for real-time visual feedback (eliminates React re-render lag)
- Updates position via `transform: translate()` during drag, commits to state on mouseup
- Result: Annotations follow cursor exactly with zero delay

**Visual Refinements**
- Minimal padding (1px 2px) and low opacity (0.1/0.2) for unobtrusive annotations
- Transitions disabled during drag for immediate response

### Important Implementation Details

1. **PDF.js Coordinate Arrays**
   - `viewport.convertToPdfPoint(x, y)` returns `[x, y]` array, NOT `{x, y}` object
   - Always destructure as arrays: `const [xPdf, yPdf] = viewport.convertToPdfPoint(x, y)`

2. **Viewport Configuration**
   - Always use `rotate: 0` to prevent PDFs from rendering upside down
   - PDF.js automatically handles coordinate transformation - don't double-transform

3. **Anchor Point Differences**
   - Text: pdf-lib draws from baseline (not top-left)
   - Images/Signatures: Draw from bottom-left corner
   - Checkmarks: Custom paths, centered on click point

4. **WYSIWYG Alignment**
   - UI rendering and PDF export use identical positioning logic
   - Signatures/checkmarks centered with `translate(-50%, -50%)` in UI
   - Export centers with `x - width/2, y - height/2` for consistency

5. **Performance-First Dragging**
   - Separate visual position (CSS transform) from logical position (React state)
   - Batch position updates on mouseup instead of every mousemove
   - Future: Consider pointer events for touch support, momentum/inertia effects

## 🏗️ Tech Stack

- **Vite** 7.1.4 - Build tool
- **React** 18 + TypeScript - UI framework
- **PDF.js** 5.4.149 - PDF rendering and coordinate mapping
- **pdf-lib** 1.17.1 - PDF modification and export
- **signature_pad** 5.1.0 - Digital signature capture
- **@pdf-lib/fontkit** - Font embedding support

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Deployment

This application is designed to deploy to Cloudflare Pages:

1. Connect your GitHub repository to Cloudflare Pages
2. Build settings are auto-detected (Vite)
3. Deploy automatically on git push

## 🔒 Security

- Content Security Policy headers configured
- No external API calls or data transmission
- All PDF processing happens client-side
- Privacy-focused architecture

## 📄 License

MIT