# Offline Support Test Plan

## Test Environment Setup
- Chrome DevTools (Application tab)
- Mobile device or emulator
- Network throttling tools

## Manual Test Cases

### 1. Service Worker Registration
**Steps:**
1. Open app in Chrome
2. Open DevTools → Application → Service Workers
3. Verify service worker is registered and active

**Expected:** Service worker shows as "activated and is running"

### 2. Initial Cache Population
**Steps:**
1. Clear all site data (DevTools → Application → Clear Storage)
2. Load the app fresh
3. Check Cache Storage in DevTools

**Expected:** 
- Static cache contains: index.html, JS bundles, CSS files
- Runtime cache empty initially

### 3. Offline Mode - Static Assets
**Steps:**
1. Load app online
2. Go offline (DevTools → Network → Offline)
3. Refresh the page

**Expected:** App loads successfully from cache

### 4. PDF Caching
**Steps:**
1. Load a PDF online (< 50MB)
2. Go offline
3. Reload the app
4. Try to access the same PDF

**Expected:** PDF loads from cache

### 5. Large PDF Handling
**Steps:**
1. Try loading a PDF > 50MB
2. Go offline
3. Try to access the PDF again

**Expected:** PDF not cached, appropriate error message

### 6. PWA Installation - Mobile
**Steps:**
1. Open app in Chrome mobile
2. Wait for install prompt or use menu → "Add to Home Screen"
3. Install the app
4. Open from home screen

**Expected:** 
- App opens in standalone mode
- No browser UI visible
- App icon and splash screen display

### 7. PWA Installation - Desktop
**Steps:**
1. Open app in Chrome desktop
2. Click install icon in address bar
3. Install the app
4. Open from desktop/dock

**Expected:** App opens in standalone window

### 8. Update Detection
**Steps:**
1. Deploy new version
2. Have app open
3. Wait 1 hour or refresh

**Expected:** Console shows "New content available"

### 9. Share Target (Mobile)
**Steps:**
1. Install PWA
2. Share a PDF from another app
3. Select the Sign PDF app

**Expected:** PDF opens in the app

### 10. File Association (Desktop)
**Steps:**
1. Install PWA on desktop
2. Right-click a PDF file
3. Choose "Open with" → Sign PDF

**Expected:** PDF opens in the app

## Automated Test Suite

### Playwright E2E Tests
```typescript
// tests/offline/service-worker.spec.ts
test('service worker registers successfully', async ({ page }) => {
  await page.goto('/');
  const swRegistered = await page.evaluate(() => 
    'serviceWorker' in navigator
  );
  expect(swRegistered).toBe(true);
});

test('app works offline after first visit', async ({ page, context }) => {
  // First visit online
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Go offline
  await context.setOffline(true);
  
  // Reload should work
  await page.reload();
  await expect(page.locator('h1')).toContainText('Sign PDF');
});
```

## Performance Metrics
- Service worker registration time: < 100ms
- Cache hit ratio: > 90% for static assets
- Time to first byte (offline): < 50ms
- PDF cache retrieval: < 200ms

## Browser Compatibility Matrix
| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅* | ❌ | ✅ |
| Share Target | ✅ | ❌ | ❌ | ✅ |
| File Handlers | ✅ | ❌ | ❌ | ✅ |

*Safari: Add to Home Screen on iOS only

## Debugging Checklist
- [ ] Service worker registered?
- [ ] HTTPS or localhost?
- [ ] Manifest linked correctly?
- [ ] Cache storage not full?
- [ ] No console errors?
- [ ] Network tab shows (ServiceWorker) for cached resources?

## Common Issues & Solutions

### Service Worker Not Registering
- Check HTTPS/localhost requirement
- Verify service-worker.js in public root
- Check console for registration errors

### Cache Not Working
- Clear all site data and retry
- Check cache size limits
- Verify cache names match

### PWA Not Installable
- Check manifest.json requirements
- Verify HTTPS
- Ensure start_url is accessible
- Check for console errors

## Regression Test Checklist
After any changes to offline functionality:
- [ ] Service worker still registers
- [ ] Static assets cache properly
- [ ] PDF upload works offline
- [ ] Signature drawing works offline
- [ ] PWA remains installable
- [ ] Share target still functions
- [ ] No memory leaks in cache
- [ ] Update detection works

## Success Criteria
- 100% functionality available offline after first visit
- < 3 second load time offline
- Successful PWA installation on 3+ devices
- No data loss when transitioning offline/online
- Graceful degradation for unsupported browsers