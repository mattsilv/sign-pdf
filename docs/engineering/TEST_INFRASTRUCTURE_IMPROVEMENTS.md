# Test Infrastructure Improvements

## Problem Statement

During the implementation of signature UI enhancements, we encountered several test reliability issues that need systematic solutions to prevent future brittleness and improve maintainability.

## Issues Identified

### 1. **Selector Brittleness** 
- Tests using CSS selectors like `.pdf-page` that don't exist
- Ambiguous selectors matching multiple elements (multiple "Clear" buttons)
- No validation that test selectors actually exist in the codebase

### 2. **ES Module Compatibility**
- Tests using `__dirname` failing in ES modules
- Path resolution issues between CommonJS and ES module environments

### 3. **Timeout and Race Conditions**
- Tests timing out due to waiting for wrong elements
- Insufficient wait strategies for dynamic content (PDF loading, canvas rendering)

### 4. **No Single Source of Truth**
- CSS class names scattered throughout codebase
- No centralized way to validate test selectors against actual implementation
- Test selectors can become stale when UI changes

## Proposed Solutions

### Phase 1: Selector Validation (Priority: High)

#### 1.1 CSS Class Constants File
Create `src/constants/selectors.ts`:
```typescript
export const SELECTORS = {
  PDF: {
    VIEWER: '.pdf-viewer-container',
    PAGE: '.pdf-page-wrapper',
    CANVAS: '.pdf-page-canvas'
  },
  SIGNATURE: {
    MODAL: '.signature-modal',
    CANVAS: '.signature-canvas', 
    TEXT_INPUT: '.signature-text-input',
    CLEAR_BUTTON: '.signature-modal-actions button[data-action="clear"]',
    SAVE_BUTTON: '.signature-modal-actions button[data-action="save"]'
  },
  TOOLS: {
    PANEL: '.tool-panel',
    SIGNATURE_BUTTON: '[data-tool="signature"]',
    EDIT_SIGNATURE: '[data-action="edit-signature"]'
  }
} as const;
```

#### 1.2 Test Selector Validation Script
```bash
# Script: scripts/validate-test-selectors.js
# Validates that all selectors used in tests exist in the codebase
```

#### 1.3 Data Attributes for Test Stability
Add `data-testid` and `data-action` attributes to key elements:
```jsx
<button 
  className="tool-button" 
  data-testid="signature-button"
  data-tool="signature"
>
  Signature
</button>
```

### Phase 2: Test Architecture (Priority: Medium)

#### 2.1 Page Object Model
Create page objects for major UI sections:
```javascript
// tests/page-objects/SignatureModal.js
export class SignatureModal {
  constructor(page) { this.page = page; }
  
  async switchToTypeMode() {
    await this.page.getByTestId('type-signature-radio').click();
  }
  
  async typeSignature(text) {
    await this.page.getByTestId('signature-text-input').fill(text);
  }
}
```

#### 2.2 Robust Wait Strategies
```javascript
// Utility functions for common wait patterns
export const waitFor = {
  pdfToLoad: (page) => page.waitForSelector('[data-testid="pdf-loaded"]'),
  signatureModalOpen: (page) => page.waitForSelector('[data-testid="signature-modal"]'),
  canvasReady: (page) => page.waitForFunction(() => 
    document.querySelector('.signature-canvas')?.getContext('2d') !== null
  )
};
```

#### 2.3 Test Categories and Structure
```
tests/
├── unit/           # Component unit tests
├── integration/    # Feature integration tests  
├── e2e/
│   ├── core/      # Essential user workflows
│   ├── edge/      # Edge cases and error handling
│   └── visual/    # Screenshot/visual regression
└── utils/         # Test utilities and helpers
```

### Phase 3: Development Workflow (Priority: Low)

#### 3.1 Pre-commit Hooks
- Validate test selectors exist
- Run quick smoke tests on signature functionality
- Check for hardcoded selectors in tests

#### 3.2 CSS Change Detection
- Script to detect when CSS classes used in tests are modified
- Automated test selector updates when possible

#### 3.3 Visual Regression Testing
- Baseline screenshots for signature UI states
- Automated comparison on UI changes

## Implementation Plan

### Week 1: Selector Stability
- [ ] Add data-testid attributes to all signature UI elements
- [ ] Create SELECTORS constants file
- [ ] Update existing tests to use data-testid selectors
- [ ] Create selector validation script

### Week 2: Test Robustness  
- [ ] Implement page object models for signature workflows
- [ ] Add proper wait strategies for async operations
- [ ] Create test utilities for common operations

### Week 3: Automation & CI
- [ ] Add pre-commit hooks for selector validation
- [ ] Set up visual regression testing baseline
- [ ] Document test writing guidelines

## Success Metrics

1. **Zero selector-based test failures** due to missing elements
2. **Reduce test execution time** by 25% through better wait strategies  
3. **Increase test maintainability** - UI changes shouldn't break unrelated tests
4. **Improve developer experience** - clear error messages when tests fail

## Tools and Libraries

- **Selector Validation**: Custom Node.js script using AST parsing
- **Visual Testing**: Playwright built-in screenshot comparison
- **Pre-commit**: Husky + lint-staged
- **Page Objects**: Custom implementation using Playwright patterns

## Future Considerations

- Integration with design system component library
- Automated accessibility testing in E2E flows  
- Performance testing for signature operations
- Cross-browser compatibility testing automation

---

This plan addresses the root causes of test brittleness while establishing patterns for maintainable, reliable test infrastructure going forward.