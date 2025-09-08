# Remaining Mobile Refactoring Work

## Overview
Phase C of mobile optimizations has been partially completed. Critical linting errors have been fixed and ResponsiveToolbar has been integrated, but several issues remain that need attention.

## ✅ Completed in This Session
1. **Fixed all critical linting errors** that were blocking commits
2. **Integrated ResponsiveToolbar component** - Mobile users now get an optimized toolbar
3. **Fixed TypeScript type issues** in test files
4. **Service worker console.log cleanup**

## 🚨 Priority Issues Remaining

### 1. Fix Pre-commit Test Hook (HIGH PRIORITY)
**Issue**: Pre-commit tests are failing with timeout
- Test tries to click 'Try with Sample NDA Document' but times out
- Dev server starts on wrong port (5174 instead of 5173)
- Tests expect server on 5173
**Fix**: Update test configuration or pre-commit hook to handle port conflicts

### 2. Fix Swipe Navigation Tests (HIGH PRIORITY)
**Issue**: 4 of 7 swipe navigation tests failing
- Missing UI elements (.page-nav)
- Touch event simulation not working correctly
- Tests passing: 3/7
**Location**: `tests/mobile/swipe-navigation.spec.ts`
**Fix**: 
- Add missing navigation UI elements
- Fix touch event creation/dispatch
- Ensure swipe gestures properly integrated with PDF viewer

### 3. Complete Annotation Layer Integration (MEDIUM)
**Issue**: AnnotationLayer component created but not fully integrated
- Component exists at `src/components/AnnotationLayer.tsx`
- Needs hover/touch state handling
- Not connected to main PDF viewer
**Fix**: Wire up AnnotationLayer with proper touch/hover states

### 4. Fix ResponsiveToolbar Test Paths (MEDIUM)
**Issue**: Test file paths need correction
- Tests reference 'coordinate_test.pdf' with incorrect paths
- All 7 ResponsiveToolbar tests currently failing due to path issues
**Location**: `tests/mobile/responsive-toolbar.spec.ts`
**Fix**: Update file paths or move test PDF to expected location

### 5. Real Device Testing (MEDIUM)
**What to test**:
- PWA installation flow
- Haptic feedback on real devices
- Pinch-to-zoom gestures
- Offline mode with service worker
- Performance on older devices

### 6. Fix React Hook Warnings (LOW)
**Issue**: Several React Hook dependency warnings remain
- BottomSheet.tsx: useCallback needed for event handlers
- PDFViewer.tsx: Missing dependencies in useEffect
- useVirtualizedPages.ts: Ref cleanup issue
**Fix**: Add proper dependencies or use useCallback where appropriate

## Technical Debt
1. **Port conflict in tests**: Dev server and test server competing for port 5173
2. **Missing playground mode**: Debug components were removed - consider adding development-only debug mode
3. **Test fixture organization**: Test PDFs scattered, need central fixtures directory

## Files Modified in This Session
- `/src/App.tsx` - Added ResponsiveToolbar integration
- `/src/components/BottomSheet.tsx` - Fixed linting errors
- `/src/components/CoordinateDebugger.tsx` - Fixed duplicate export
- `/public/service-worker.js` - Removed console.log statements
- Various test files - Type fixes and path updates

## Next Steps for Engineer
1. Fix the pre-commit hook timeout issue (blocks all commits)
2. Complete swipe navigation implementation
3. Run full test suite and fix failures
4. Test on real mobile devices
5. Consider adding e2e tests for mobile-specific features

## Testing Commands
```bash
# Run all mobile tests
npm run test:mobile

# Run specific test suites
npx playwright test tests/mobile/swipe-navigation.spec.ts
npx playwright test tests/mobile/responsive-toolbar.spec.ts
npx playwright test tests/mobile/haptic-feedback.spec.ts

# Run with UI for debugging
npx playwright test --ui

# Check linting (should pass now)
npm run lint
```

## Important Notes
- ResponsiveToolbar switches automatically at 768px breakpoint
- Haptic feedback integrated throughout app (uses vibration API)
- Service worker provides offline support but needs testing
- Mobile toolbar shows text, signature, export as primary tools
- Secondary tools in bottom sheet via "more" button