# Complete E2E Testing & Stabilization

## 🎯 Objective
Ensure the core user journey works flawlessly on both desktop and mobile platforms, from loading the app to exporting a signed PDF.

## 📋 Current State
- Mobile refactoring partially complete (swipe navigation, responsive toolbar, haptics)
- Basic functionality implemented but not thoroughly tested
- Some test infrastructure issues (timeouts, missing files)
- 6 commits ahead of origin/main awaiting validation

## ✅ Acceptance Criteria

### Desktop Flow
- [ ] User can load the app and see the welcome screen
- [ ] "Try with Sample NDA Document" loads the PDF successfully
- [ ] All annotation tools work (Text, Signature, Initials, Date)
- [ ] Annotations can be placed, moved, and deleted
- [ ] PDF exports with all annotations intact
- [ ] Signature persistence works across sessions
- [ ] No console errors during normal usage

### Mobile Flow  
- [ ] Responsive toolbar appears on mobile viewports (<768px)
- [ ] Touch interactions work for placing annotations
- [ ] Swipe navigation between pages functions correctly
- [ ] Pinch-to-zoom works (if implemented)
- [ ] Haptic feedback triggers appropriately
- [ ] PDF exports work on mobile devices
- [ ] Offline mode functions correctly

### Test Coverage
- [ ] `tests/e2e/complete-user-journey.spec.ts` passes fully
- [ ] All existing E2E tests pass
- [ ] Mobile-specific tests pass
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
- [ ] Real device testing completed (iOS, Android)

## 🐛 Known Issues to Fix

### High Priority
1. **Test Infrastructure**
   - Some tests timeout waiting for elements
   - Missing `coordinate_test.pdf` (tests updated to use sample NDA)
   - Port conflicts between 5173/5174

2. **Mobile Touch Events**
   - AnnotationLayer doesn't properly handle touch events
   - Drag-and-drop needs mobile optimization
   - Touch feedback animations missing

3. **E2E Test Stability**
   - Add proper wait conditions
   - Handle async operations correctly
   - Improve error messages

### Medium Priority
4. **Performance**
   - Test and optimize for older devices
   - Reduce initial bundle size
   - Optimize PDF rendering on mobile

5. **UI Polish**
   - Improve error handling and user feedback
   - Add loading states
   - Enhance accessibility

## 🔧 Technical Details

### New Test File Created
`tests/e2e/complete-user-journey.spec.ts` - Comprehensive test covering:
- Complete desktop signing flow
- Complete mobile signing flow  
- Error handling
- Preference persistence
- Offline functionality
- Keyboard navigation
- Performance metrics

### Files Modified Recently
- `.husky/pre-commit` - Fixed port detection
- `tests/mobile/*.spec.ts` - Updated to use sample NDA
- All test files - Added proper wait conditions

### Key Components Needing Attention
- `src/components/AnnotationLayer.tsx` - Touch event handling
- `src/components/VirtualizedPDFViewer.tsx` - Performance optimization
- `src/hooks/useVirtualizedPages.ts` - React hook warnings

## 📝 Testing Checklist

### Manual Testing
- [ ] Load app on desktop browser
- [ ] Complete full signing flow on desktop
- [ ] Load app on mobile browser  
- [ ] Complete full signing flow on mobile
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Test offline functionality
- [ ] Test with large PDFs (performance)

### Automated Testing
```bash
# Run comprehensive E2E test
npm run test -- tests/e2e/complete-user-journey.spec.ts

# Run with visual debugging
npx playwright test --ui

# Run specific test suites
npm run test -- --grep "Desktop"
npm run test -- --grep "Mobile"
```

## 🚀 Getting Started

1. **Setup Environment**
```bash
git pull origin main
npm install
npm run dev
```

2. **Run Existing Tests**
```bash
npm test
```

3. **Fix Test Failures**
- Start with `complete-user-journey.spec.ts`
- Use Playwright UI mode for debugging
- Check selectors match actual DOM

4. **Manual Verification**
- Test complete flow on desktop
- Test complete flow on mobile (use DevTools emulation)
- Test on real devices if available

## 📊 Success Metrics
- 100% E2E test pass rate
- <3s PDF load time
- <1s annotation placement
- 0 console errors
- Smooth 60fps interactions

## 🔗 Related Issues
- #1 - Coordinate alignment bug (resolved)
- #22 - Mobile refactoring (in progress)

## 📚 Resources
- [Engineering Handoff Document](./ENGINEERING_HANDOFF.md)
- [Mobile Refactoring Primer](./docs/MOBILE_REFACTORING_PRIMER.md)
- [Playwright Documentation](https://playwright.dev)

---

**Priority:** 🔴 High  
**Effort:** 2-3 days  
**Labels:** `testing`, `mobile`, `bug`, `enhancement`