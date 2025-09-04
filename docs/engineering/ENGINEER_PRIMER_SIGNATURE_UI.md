# Engineer Handoff: Signature UI Enhancements

**GitHub Issue**: https://github.com/mattsilv/sign-pdf/issues/3
**Priority**: P2 - Important UX improvement
**Estimated Effort**: 2-3 days

## The Problem (30 seconds)

Users are losing work and can't reuse signatures across sessions. The signature tool needs several UX improvements:

1. **Accidental click = lost signature** - Click outside modal → signature gone, no warning
2. **Can't edit after creation** - Must delete and recreate from scratch
3. **Drawing only** - No typing option (accessibility issue)
4. **No persistence** - Recreate signature every session
5. **Unclear buttons** - Missing standard icons on Export/Start Over

## Quick Start (2 minutes)

```bash
npm run dev
# 1. Click "Signature" tool
# 2. Draw something
# 3. Click outside modal → Poof! Work lost (bad UX)
# 4. Reload page → No saved signature
# 5. Notice Export PDF/Start Over buttons lack icons
```

## What You're Building

### 1. Unsaved Work Protection
```javascript
// Before: Click outside = lose everything
// After: Click outside = "You have an unsaved signature. Close without saving?"
```

### 2. Edit Signature Button
```javascript
// New button appears after signature creation
<button onClick={editSignature}>
  Edit Signature
</button>
```

### 3. Type OR Draw Toggle
```javascript
// Radio buttons or toggle switch
○ Draw Signature  ● Type Signature

// Type mode shows text input with cursive font
<input style={{ fontFamily: 'Brush Script MT, cursive' }} />
```

### 4. Browser Persistence
```javascript
// Save to localStorage
localStorage.setItem('pdfSigner_signature', JSON.stringify({
  mode: 'draw|type',
  data: 'base64_or_text',
  timestamp: Date.now()
}));

// Visual feedback
✓ Saved in browser [Clear]
```

### 5. Standard Icons
```javascript
// Add SVG icons to buttons
📥 Export PDF    ↻ Start Over
```

## Key Files to Modify

1. **`src/components/SignaturePad.tsx`** (main changes)
   - Add confirmation dialog for close
   - Add type/draw toggle UI
   - Implement text input for typing
   - Save/load from localStorage

2. **`src/components/ToolPanel.tsx`**
   - Add Edit Signature button
   - Add icons to Export/Start Over
   - Show storage status indicator

3. **`src/App.css`**
   - Style new UI elements
   - Cursive font for typed signatures
   - Storage indicator styling

## Implementation Order (Recommended)

### Phase 1: Core Features (Day 1)
1. Add close confirmation dialog (30 min)
2. Implement type/draw toggle (2 hours)
3. Create typed signature UI (1 hour)
4. Test both modes work (30 min)

### Phase 2: Persistence (Day 1-2)
1. Implement localStorage save (1 hour)
2. Load on component mount (1 hour)
3. Add storage indicator UI (30 min)
4. Add clear function (30 min)

### Phase 3: Polish (Day 2)
1. Add Edit Signature button (1 hour)
2. Add standard icons (1 hour)
3. Test across browsers (1 hour)
4. Fix any export issues (1 hour)

## Critical Technical Details

### Local Storage Keys
```javascript
const STORAGE_KEY = 'pdfSigner_signature';
const STORAGE_VERSION = 1; // For future migrations
```

### Typed Signature Font Stack
```css
font-family: 'Brush Script MT', 'Lucida Handwriting', 
             'Apple Chancery', cursive;
```

### State Shape
```typescript
interface SignatureState {
  mode: 'draw' | 'type';
  drawnData?: string;    // base64 data URL
  typedText?: string;    // plain text
  savedToStorage: boolean;
  lastModified?: number;
}
```

### Converting Typed to Canvas
```javascript
// When exporting typed signature to PDF
const textToCanvas = (text: string): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '24px Brush Script MT';
  ctx.fillText(text, 10, 30);
  return canvas.toDataURL();
};
```

## Testing Checklist

### Manual Testing
- [ ] Draw signature → click outside → see warning
- [ ] Type signature → saves to localStorage
- [ ] Reload page → signature persists
- [ ] Clear storage → signature removed
- [ ] Edit existing signature works
- [ ] Export PDF includes typed signature
- [ ] Icons display correctly

### Browser Testing
- [ ] Chrome - localStorage works
- [ ] Firefox - cursive font renders
- [ ] Safari - all features work
- [ ] Edge - no console errors

### Edge Cases
- [ ] localStorage full/disabled
- [ ] Very long typed signatures
- [ ] Special characters in typed text
- [ ] Switch modes with existing signature

## Common Pitfalls to Avoid

1. **Don't break existing draw functionality** - Add features, don't replace
2. **Handle localStorage exceptions** - Some users block it
3. **Test PDF export** - Typed signatures must render correctly
4. **Preserve coordinates** - Don't break the positioning system we fixed

## Success Verification

You're done when:
1. ✅ Can't lose work by accident
2. ✅ Signature persists across sessions
3. ✅ Can type OR draw signatures
4. ✅ Clear visual feedback about storage
5. ✅ Icons make buttons clearer
6. ✅ All existing features still work

## Questions to Consider

1. Should typed signatures have multiple font options?
2. Should we export localStorage data?
3. Maximum storage time before auto-clear?
4. Multi-signature support (personal/initials)?

---

**Your mission**: Make the signature tool remember user preferences, prevent data loss, and add typing option for better accessibility. The core signature placement and coordinate system are working perfectly - just enhance the UI/UX layer!

## Need Help?

- Current signature code: `src/components/SignaturePad.tsx`
- Coordinate system (don't change): `src/lib/pdf/coordinates.ts`
- Similar localStorage example: Search for "localStorage" in other React projects
- Icon libraries: Feather Icons, Heroicons (inline SVG preferred)