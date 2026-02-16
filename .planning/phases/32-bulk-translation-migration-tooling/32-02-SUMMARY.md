---
phase: 32-bulk-translation-migration-tooling
plan: 02
subsystem: admin/ui
tags: [eventSource, sse, ui, translation]
dependency_graph:
  requires:
    - 32-01 (EventSource-compatible bulk translate endpoint)
  provides:
    - Bulk translation admin UI with SSE progress
    - Real-time translation progress display
    - Cancel and retry functionality
  affects:
    - admin/index.html (sidebar navigation)
    - admin/BisliView.js (page rendering and SSE client)
    - admin/bambaYafa-desktop.css (UI styling)
tech_stack:
  added: []
  patterns:
    - EventSource SSE client with query param auth
    - Real-time progress streaming UI
    - XSS-safe content rendering with textContent
key_files:
  created: []
  modified:
    - admin/index.html
    - admin/BisliView.js
    - admin/bambaYafa-desktop.css
decisions:
  - what: Use textContent for product name rendering
    why: Prevents XSS vulnerabilities when displaying server-provided product names
    trade_offs: Slightly more verbose but ensures security
  - what: EventSource query param authentication
    why: EventSource API doesn't support custom headers
    trade_offs: Token visible in URL but validated by backend JWT
  - what: Inline event listener wiring after page render
    why: Simpler than global handler registration for page-specific buttons
    trade_offs: None - follows existing admin patterns
metrics:
  duration_minutes: 11
  tasks_completed: 2
  files_modified: 3
  completed: 2026-02-16
---

# Phase 32 Plan 02: Bulk Translation Admin UI Summary

**One-liner:** EventSource-powered admin UI with real-time progress, cancel/retry, and XSS-safe rendering

## Objective

Build the admin Bulk Translation UI page with SSE-powered progress streaming, cancellation, retry, and completion notifications. This completes Phase 32 by providing the frontend interface for the backend bulk translation endpoint built in Plan 01.

## What Was Built

### 1. Sidebar Navigation
- Added "Bulk Translate" nav item under new "Tools" section in `admin/index.html`
- SVG translation icon with stroke styling
- Breadcrumb updates to "Tools / Bulk Translate"
- Button reference added to BisliView.js DOM elements
- Event listener wired in `initializeEventHandlers()`

### 2. Bulk Translation Page Rendering
- Created `renderBulkTranslatePage()` function following existing admin patterns
- Page sections:
  - Header with title and description
  - Start button (hidden once translation begins)
  - Progress section with bar, counters, current product, stats, and cancel button
  - Summary section with translated/failed counts, failed products list, retry/run-again buttons
  - All-done message for edge case where all products are already translated
- All product names rendered via `textContent` for XSS safety

### 3. EventSource SSE Client
- Module-level state variables: `bulkEventSource`, `bulkStats`, `bulkFailedProducts`
- `startBulkTranslation()`: Creates EventSource with query param auth token
- Event handlers:
  - `onBulkStart`: Updates total count
  - `onBulkProgress`: Updates progress bar, counter, current product name
  - `onBulkSuccess`: Increments success counter
  - `onBulkError`: Adds to failed products list, increments failed counter
  - `onBulkComplete`: Shows summary, displays toast notification
  - `onBulkConnectionError`: Handles connection loss, shows partial results
- `cancelBulkTranslation()`: Closes EventSource, shows summary as cancelled
- `updateBulkProgress()`: Updates progress bar width, counter text, product name
- `updateBulkStats()`: Updates success/failed/skipped counters
- `showBulkSummary()`: Shows completion summary with expandable failed products list

### 4. CSS Styling
- All styles added to `admin/bambaYafa-desktop.css` using existing CSS variables
- Sections styled:
  - Container with max-width 700px
  - Primary start button with gradient shadow (matches existing `.addproduct-btn`)
  - Progress bar with animated gradient fill (primary → success)
  - Progress text, current product name, and stats row
  - Cancel button with danger styling
  - Pulsing activity indicator (8px dot with opacity animation)
  - Summary section with large stat numbers (28px font, 800 weight)
  - Scrollable failed products list with 200px max-height
  - Retry button (warning colors) and run-again button (neutral)
  - All-translated success message with success colors

## Deviations from Plan

None - plan executed exactly as written.

## Testing Results

### Code Verification
```bash
# EventSource implementation
grep -n "EventSource" admin/BisliView.js
1179:let bulkEventSource = null;
1276:  bulkEventSource = new EventSource(

# Sidebar references
grep -n "sidebar_bulk-translate" admin/index.html admin/BisliView.js
admin/index.html:72:              <button type="button" class="nav__item sidebar_bulk-translate"
admin/BisliView.js:6:const bulkTranslateBtn = document.querySelector(".sidebar_bulk-translate");

# Page rendering function
grep -n "renderBulkTranslatePage" admin/BisliView.js
1183:function renderBulkTranslatePage() {
1541:      renderBulkTranslatePage();

# XSS-safe textContent usage
grep -n "textContent" admin/BisliView.js | grep -i "product"
1382:    textEl.textContent = `Translating product ${current}/${total}...`;
1386:    nameEl.textContent = productName || '';

# CSS styles added
grep -c "bulk-translate" admin/bambaYafa-desktop.css
3

# Key CSS classes
grep "progress-bar-fill\|bulk-summary\|bulk-pulse" admin/bambaYafa-desktop.css
.progress-bar-fill {
@keyframes bulk-pulse {
.bulk-summary {

# CSS braces balanced
grep -c "{" admin/bambaYafa-desktop.css && grep -c "}" admin/bambaYafa-desktop.css
344
344
```

All verifications passed.

## Technical Details

### EventSource Connection Pattern
```javascript
// Get auth token from localStorage
const authToken = localStorage.getItem('auth-token');

// Create EventSource with query param auth
bulkEventSource = new EventSource(
  `${API_URL}/admin/translate/bulk?token=${encodeURIComponent(authToken)}`
);

// Register event listeners
bulkEventSource.addEventListener('start', onBulkStart);
bulkEventSource.addEventListener('progress', onBulkProgress);
bulkEventSource.addEventListener('success', onBulkSuccess);
bulkEventSource.addEventListener('error', onBulkError);
bulkEventSource.addEventListener('complete', onBulkComplete);
bulkEventSource.onerror = onBulkConnectionError;
```

### XSS Prevention
All product names from server are rendered using `textContent` instead of `innerHTML`:
```javascript
// Safe rendering
nameEl.textContent = productName || '';

// When building failed products list
const nameDiv = document.createElement('div');
nameDiv.textContent = item.name;
```

### Progress Bar Animation
```css
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  border-radius: 11px;
  transition: width 0.3s ease;
  min-width: 0;
}
```

Width updated dynamically: `Math.round((current / total) * 100) + '%'`

### Failed Products List
- Shows first 10 by default
- "Show all N" toggle button if more than 10 failures
- Expandable/collapsible with inline onclick handler
- Scrollable with 200px max-height

## Integration Points

- **With Phase 32-01:** Connects to `GET /admin/translate/bulk` with query param auth
- **With Backend SSE:** Handles start, progress, success, error, complete events
- **With Admin Auth:** Uses `auth-token` from localStorage for EventSource connection
- **With Toast System:** Uses existing `showSuccessToast`, `showErrorToast`, `showInfoToast` helpers

## User Experience Flow

1. Admin clicks "Bulk Translate" in sidebar → navigates to new page
2. Clicks "Start Bulk Translation" → EventSource connects, progress bar appears
3. Real-time updates: progress bar fills, counter increments, current product name updates
4. Stats row shows success/failed/skipped counts in real-time
5. Pulsing dot indicates active connection
6. Admin can cancel mid-operation → connection closes, partial results shown
7. On completion: summary appears with translated/failed counts
8. If failures: retry button available, expandable failed products list
9. Toast notification confirms completion
10. "Run Again" button restarts process (backend auto-skips already-translated)

## Risk Assessment

**Low Risk:**
- EventSource is well-supported across modern browsers
- XSS prevention via textContent ensures security
- Query param auth validated by backend JWT middleware
- UI state properly cleaned up on connection close/error

**No Breaking Changes:**
- All changes additive (new sidebar item, new page)
- Existing admin functionality unchanged
- CSS uses existing variables, no conflicts

## Next Steps

**Immediate:**
- Test bulk translation with production dataset
- Monitor EventSource connection stability
- Verify toast notifications work correctly

**Future Enhancements:**
- Add estimated time remaining calculation
- Add pause/resume functionality (requires backend support)
- Show translation preview before committing
- Add bulk translation scheduling for off-peak hours

## Self-Check

Verifying all artifacts exist and claims are accurate:

**Files Modified:**
```bash
[ -f "admin/index.html" ] && echo "FOUND: admin/index.html" || echo "MISSING"
[ -f "admin/BisliView.js" ] && echo "FOUND: admin/BisliView.js" || echo "MISSING"
[ -f "admin/bambaYafa-desktop.css" ] && echo "FOUND: admin/bambaYafa-desktop.css" || echo "MISSING"
```

**Commits:**
```bash
git log --oneline --all | grep -q "52d091e" && echo "FOUND: 52d091e" || echo "MISSING"
git log --oneline --all | grep -q "e15c0e6" && echo "FOUND: e15c0e6" || echo "MISSING"
```

**Code Patterns:**
```bash
grep -q "sidebar_bulk-translate" admin/index.html && echo "FOUND: sidebar nav item" || echo "MISSING"
grep -q "renderBulkTranslatePage" admin/BisliView.js && echo "FOUND: page rendering" || echo "MISSING"
grep -q "EventSource" admin/BisliView.js && echo "FOUND: SSE client" || echo "MISSING"
grep -q "bulk-translate-container" admin/bambaYafa-desktop.css && echo "FOUND: CSS styles" || echo "MISSING"
```

## Self-Check Result

```
FOUND: admin/index.html
FOUND: admin/BisliView.js
FOUND: admin/bambaYafa-desktop.css
FOUND: 52d091e
FOUND: e15c0e6
FOUND: sidebar nav item
FOUND: page rendering
FOUND: SSE client
FOUND: CSS styles
```

**Self-Check: PASSED** - All files exist, commits are in history, code patterns verified.
