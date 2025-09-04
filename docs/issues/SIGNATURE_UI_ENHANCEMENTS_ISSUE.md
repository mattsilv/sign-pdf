# Feature: Enhanced Signature UI with Persistence and Type/Draw Options

## Summary
Enhance the signature modal interface to provide better UX, add typing option alongside drawing, implement local storage persistence, and improve action buttons with standard icons.

## Current Issues

### 1. Accidental Dismissal Loses Work
**Problem**: If a user accidentally clicks outside the signature modal after drawing their signature, the modal closes and their signature is lost without warning.

**Expected Behavior**: Show confirmation dialog when attempting to close modal with unsaved signature.

### 2. No Edit Capability After Creation
**Problem**: Once a signature is created, users cannot edit it without starting over completely.

**Expected Behavior**: Add "Edit Signature" button to allow modifying existing signature.

### 3. Drawing-Only Limitation
**Problem**: Users can only draw signatures, cannot type them (accessibility issue and user preference).

**Expected Behavior**: Provide option to either draw OR type a signature.

### 4. No Persistence Across Sessions
**Problem**: Users must recreate their signature every time they use the tool.

**Expected Behavior**: Save signature preference and data to localStorage for reuse.

### 5. Missing Visual Feedback
**Problem**: Action buttons lack standard icons, making their purpose less immediately clear.

**Expected Behavior**: Add standard icons to Export PDF and Start Over buttons.

## Proposed Implementation

### 1. Prevent Accidental Dismissal
```typescript
// SignaturePad.tsx
const handleClose = () => {
  if (!isEmpty && !saved) {
    if (confirm('You have an unsaved signature. Are you sure you want to close without saving?')) {
      onClose();
    }
  } else {
    onClose();
  }
};
```

### 2. Edit Signature Button
Add button in ToolPanel after signature is created:
```typescript
{signatureDataUrl && (
  <button onClick={() => setIsSignaturePadOpen(true)}>
    Edit Signature
  </button>
)}
```

### 3. Type or Draw Toggle
```typescript
interface SignatureModalState {
  mode: 'draw' | 'type';
  drawnSignature?: string;
  typedSignature?: string;
}

// UI with radio buttons or toggle
<div className="signature-mode-selector">
  <label>
    <input type="radio" name="mode" value="draw" checked={mode === 'draw'} />
    Draw Signature
  </label>
  <label>
    <input type="radio" name="mode" value="type" checked={mode === 'type'} />
    Type Signature
  </label>
</div>

// Show canvas or text input based on mode
{mode === 'draw' ? (
  <canvas ref={canvasRef} />
) : (
  <input 
    type="text" 
    value={typedSignature} 
    onChange={e => setTypedSignature(e.target.value)}
    placeholder="Type your signature"
    style={{ fontFamily: 'Brush Script MT, cursive' }}
  />
)}
```

### 4. Local Storage Persistence
```typescript
// Save to localStorage
const saveSignatureToStorage = (signature: SignatureData) => {
  localStorage.setItem('pdfSigner_signature', JSON.stringify({
    mode: signature.mode,
    data: signature.data,
    timestamp: Date.now()
  }));
};

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('pdfSigner_signature');
  if (saved) {
    const signature = JSON.parse(saved);
    setSignatureMode(signature.mode);
    setSignatureData(signature.data);
  }
}, []);

// Visual indicator
<div className="storage-indicator">
  <span>✓ Saved in browser</span>
  <button onClick={clearStorage}>Clear</button>
</div>
```

### 5. Standard Icons for Buttons
```typescript
// ToolPanel.tsx
<button className="export-button">
  <svg className="icon"><!-- Download/Export icon --></svg>
  Export PDF
</button>

<button className="reset-button">
  <svg className="icon"><!-- Refresh/Reset icon --></svg>
  Start Over
</button>
```

## UI/UX Specifications

### Visual Design
- **Storage Indicator**: Subtle green checkmark with "Saved in browser" text
- **Clear Option**: Small "Clear" link next to storage indicator
- **Mode Toggle**: Clean radio buttons or toggle switch
- **Icons**: Use inline SVG icons from standard libraries (Feather, Heroicons)

### Interaction Flow
1. User opens signature modal
2. If saved signature exists, load it
3. User selects draw or type mode
4. For draw: canvas interface
5. For type: text input with cursive font
6. On save: Store to localStorage + show confirmation
7. On accidental close: Show warning if unsaved changes

### Accessibility
- Keyboard navigation for mode selection
- Type option for users who cannot draw
- Clear labels and ARIA attributes
- Focus management in modal

## Technical Requirements

### State Management
```typescript
interface SignatureState {
  mode: 'draw' | 'type';
  drawnData?: string;  // base64 data URL
  typedText?: string;
  savedToStorage: boolean;
  lastModified?: number;
}
```

### Local Storage Schema
```json
{
  "mode": "draw|type",
  "data": "base64_or_text",
  "timestamp": 1234567890,
  "version": 1
}
```

### Font for Typed Signatures
Use CSS font stack with fallbacks:
```css
.typed-signature {
  font-family: 'Brush Script MT', 'Lucida Handwriting', 
               'Apple Chancery', cursive;
  font-size: 24px;
  color: #000;
}
```

## Implementation Checklist

- [ ] Add confirmation dialog for unsaved signatures
- [ ] Implement Edit Signature button
- [ ] Add draw/type mode toggle
- [ ] Create typed signature interface
- [ ] Implement localStorage save/load
- [ ] Add storage indicator with clear option
- [ ] Add standard icons to action buttons
- [ ] Update styles for new UI elements
- [ ] Add keyboard navigation support
- [ ] Test across browsers for localStorage support
- [ ] Test font rendering for typed signatures
- [ ] Ensure typed signatures export correctly to PDF

## Testing Requirements

### Unit Tests
- Test localStorage save/load functions
- Test mode switching logic
- Test confirmation dialog behavior

### E2E Tests
- Test full flow: draw → save → reload page → verify persistence
- Test full flow: type → save → export → verify in PDF
- Test accidental close prevention
- Test edit existing signature
- Test clear storage function

### Browser Compatibility
- Test localStorage in Chrome, Firefox, Safari, Edge
- Test cursive font rendering across platforms
- Test touch events for signature drawing on mobile

## Success Criteria

1. Users can choose between drawing or typing signatures
2. Signatures persist across browser sessions
3. Accidental dismissal shows warning for unsaved work
4. Users can edit existing signatures
5. Clear visual feedback about storage status
6. Standard icons improve button clarity
7. All existing functionality remains intact
8. Export works correctly for both drawn and typed signatures

## Related Issues
- #2 - Draggable Annotations (completed)
- #1 - PDF Signature Positioning (completed)

## Estimated Effort
2-3 days for full implementation and testing

## Priority
P2 - Important UX improvement

---

**Labels**: `enhancement`, `ux`, `accessibility`