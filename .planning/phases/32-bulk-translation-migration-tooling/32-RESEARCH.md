# Phase 32: Bulk Translation & Migration Tooling - Research

**Researched:** 2026-02-16
**Domain:** Admin UI bulk operations with Server-Sent Events (SSE), progress indicators, and migration tooling
**Confidence:** HIGH

## Summary

Phase 32 builds a one-time migration tool to translate all existing products in bulk, plus a permanent admin UI for managing future bulk translations. The backend bulk translation endpoint with SSE progress streaming already exists (Phase 28), cache invalidation utilities are ready (Phase 31), and the translation service is proven. This phase focuses on creating the admin UI: a dedicated bulk translation page with real-time progress indicators, error handling, retry mechanisms, and completion notifications.

The domain is well-understood: Server-Sent Events for streaming progress, EventSource API for client-side consumption, and standard admin dashboard patterns for bulk operations. The primary challenges are UI/UX design (clear progress visualization, error states, retry workflow) and ensuring the tool handles edge cases gracefully (API failures, partial completions, user cancellation).

**Primary recommendation:** Build a dedicated "Bulk Translation" admin page with SSE-powered progress streaming, using existing backend endpoint. Focus on clear progress visualization (N/total counter, product names, success/failure badges), cancellation support, and retry-failed-only workflow. Use Toastify for completion notification, existing spinner patterns for loading states, and ensure tool doesn't block other admin operations.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| EventSource | Native browser API | SSE client for progress streaming | Built-in browser API, automatic reconnection, proven for long-running operations |
| Toastify.js | Current (already in admin) | Toast notifications for completion | Already used throughout admin dashboard, consistent UX |
| Google Cloud Translation API v3 | Current | Backend translation service | Already integrated in Phase 28, proven with cache and retry logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-cache | Current (backend) | Translation result caching | Already integrated, reduces API costs for repeated text |
| Server-Sent Events (SSE) | Native HTTP protocol | Progress streaming from server | Already implemented in POST /admin/translate/bulk (Phase 28) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SSE (EventSource) | WebSocket | WebSocket is bidirectional (overkill for one-way progress), requires more server resources, SSE simpler for this use case |
| SSE | Polling | Polling is inefficient (wastes requests), delays in progress updates, SSE provides real-time updates with HTTP/1.1 keep-alive |
| Native EventSource | reconnecting-eventsource library | Library adds auto-reconnect on HTTP errors, but bulk translation is short-lived operation (minutes not hours), native API sufficient |

**Installation:**
No new dependencies needed. All required APIs are native browser APIs or already installed in Phase 28.

## Architecture Patterns

### Recommended Project Structure
```
admin/
├── BisliView.js          # Main admin SPA - add bulk translation page rendering
├── bambaYafa-desktop.css # Desktop styles - add progress UI and bulk tool styles
└── index.html            # No changes needed (already loads Toastify.js)

backend/
└── index.js              # Already has POST /admin/translate/bulk endpoint (Phase 28)
```

### Pattern 1: SSE Progress Streaming (Client-Side)
**What:** EventSource connects to SSE endpoint, listens for named events (start, progress, success, error, complete), updates UI in real-time
**When to use:** Long-running bulk operations (>10 seconds) where user needs visual feedback
**Example:**
```javascript
// Source: MDN Web Docs - Using server-sent events
// https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events

const eventSource = new EventSource('/admin/translate/bulk', {
  // withCredentials sends cookies for auth
  // Note: EventSource doesn't support custom headers (Authorization bearer token)
  // Must use cookie-based auth or query param token
});

eventSource.addEventListener('start', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Starting bulk translation: ${data.total} products`);
  // Update UI: show progress container, reset counters
});

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.current}/${data.total} - ${data.productName}`);
  // Update UI: increment counter, show current product name
});

eventSource.addEventListener('success', (event) => {
  const data = JSON.parse(event.data);
  // Update UI: mark product as translated, show green checkmark
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  // Update UI: mark product as failed, show red X, store for retry list
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Complete: ${data.translated} translated, ${data.failed} failed`);
  // Update UI: show summary, enable retry button if failures
  eventSource.close();
});

eventSource.onerror = (err) => {
  console.error('SSE connection error:', err);
  // Update UI: show connection error, offer retry button
  eventSource.close();
};
```

**Critical limitation:** EventSource API **does not support custom HTTP headers** (e.g., `Authorization: Bearer token`). Admin must use **cookie-based authentication** or pass token as query parameter. Current backend endpoint uses `fetchUser` middleware which reads JWT from cookies OR Authorization header, so cookie auth should work.

### Pattern 2: Progress Bar with Live Counter
**What:** Visual progress indicator showing N/total products processed, current product name, and success/failure badges
**When to use:** Any bulk operation with known total count and sequential processing
**Example:**
```html
<!-- Progress UI structure -->
<div class="bulk-translate-progress" style="display: none;">
  <h3>Bulk Translation in Progress</h3>
  <div class="progress-bar-container">
    <div class="progress-bar" style="width: 0%"></div>
  </div>
  <p class="progress-text">Translating product 0/0...</p>
  <p class="current-product">Current: <span id="current-product-name">—</span></p>

  <div class="progress-stats">
    <span class="stat-success">✓ Translated: <span id="count-success">0</span></span>
    <span class="stat-failed">✗ Failed: <span id="count-failed">0</span></span>
    <span class="stat-skipped">— Skipped: <span id="count-skipped">0</span></span>
  </div>

  <button class="btn-cancel-translation">Cancel</button>
</div>

<div class="bulk-translate-summary" style="display: none;">
  <h3>Translation Complete</h3>
  <p><strong id="summary-translated">0</strong> products translated successfully</p>
  <p><strong id="summary-failed">0</strong> products failed</p>
  <button class="btn-retry-failed" style="display: none;">Retry Failed Products</button>
  <button class="btn-close-summary">Close</button>
</div>
```

```javascript
// Update progress bar percentage
function updateProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  document.querySelector('.progress-bar').style.width = percentage + '%';
  document.querySelector('.progress-text').textContent =
    `Translating product ${current}/${total}...`;
}
```

**Warning:** Use `textContent` not `innerHTML` when displaying product names (XSS prevention).

### Pattern 3: Retry Failed Items Only
**What:** Track failed products during bulk operation, offer "Retry Failed" button that re-runs translation only for failed items
**When to use:** Bulk operations with transient failures (API rate limits, network issues) where successful items shouldn't be re-processed
**Example:**
```javascript
// Store failed products during bulk translation
const failedProducts = [];

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  failedProducts.push({
    id: data.productId,
    name: data.productName,
    error: data.error
  });
  // Update UI: increment failed counter
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  eventSource.close();

  if (data.failed > 0) {
    // Show retry button
    document.querySelector('.btn-retry-failed').style.display = 'block';

    // Store failed product list for retry (from server response)
    window.failedProductsFromServer = data.failedProducts;
  }
});

// Retry button handler
document.querySelector('.btn-retry-failed').addEventListener('click', () => {
  // Option 1: Backend already filters in POST /admin/translate/bulk
  // Just call same endpoint again, it auto-detects products needing translation
  startBulkTranslation();

  // Option 2: Create new endpoint POST /admin/translate/bulk-retry
  // that accepts array of product IDs to retry only those
  // (Recommended if retry logic needs to differ from initial bulk)
});
```

**Best practice:** Backend `/admin/translate/bulk` endpoint already filters products needing translation (checks if name_he/description_he are empty). Re-running same endpoint will naturally skip successfully translated products. No special retry endpoint needed unless you want to override this behavior.

### Pattern 4: Cancellation Support
**What:** User can cancel in-progress bulk translation, SSE connection closes, backend detects client disconnect and stops processing
**When to use:** Any long-running operation (>30 seconds) to prevent user frustration
**Example:**
```javascript
let eventSource; // Store in outer scope for cancellation

function startBulkTranslation() {
  eventSource = new EventSource('/admin/translate/bulk');

  // ... event listeners ...

  // Cancellation button
  document.querySelector('.btn-cancel-translation').addEventListener('click', () => {
    if (eventSource) {
      eventSource.close();
      console.log('Bulk translation cancelled by user');
      // Update UI: show "Cancelled" state, hide progress
    }
  });
}
```

**Backend behavior (already implemented in Phase 28):** Backend detects client disconnect via `req.on('close')` event and stops processing loop. Partial progress is already saved to database (save-as-you-go pattern).

### Anti-Patterns to Avoid
- **Blocking UI during bulk translation:** Don't disable entire admin interface. Progress should be modal or in-page, but other admin pages should remain accessible in new tabs.
- **No cancellation button:** Long operations must allow cancellation. User may realize they started operation by mistake.
- **Re-translating successful products on retry:** Backend already filters, but don't create retry logic that ignores this and re-processes everything.
- **Using POST body with EventSource:** EventSource only supports GET requests. Backend must read from query params or cookies, not request body.
- **Ignoring SSE error event:** Always implement `eventSource.onerror` handler to detect connection failures and show user-friendly error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE reconnection logic | Custom reconnect timer with exponential backoff | Native EventSource auto-reconnection | EventSource automatically reconnects on connection drop. Only use `reconnecting-eventsource` if you need reconnection on HTTP 500 errors (not needed for short-lived bulk translation). |
| Progress percentage calculation | Custom math with floating point edge cases | `Math.round((current / total) * 100)` | Simple, handles edge cases (division by zero returns NaN which can be checked), no library needed. |
| Toast notifications | Custom notification system | Toastify.js (already in admin) | Already integrated, battle-tested, consistent with existing admin UX. |
| Translation caching | Custom in-memory cache with TTL | node-cache (already in backend) | Already implemented in Phase 28, handles expiration, max keys, stats logging. |
| API retry logic | Custom retry with delays | Backend `retryWithBackoff()` (already in translationService.js) | Already implements exponential backoff with jitter, only retries transient errors (429, 500, 503). |

**Key insight:** Phase 28 already implemented the hard parts (SSE endpoint, translation caching, retry logic, save-as-you-go persistence). Phase 32 is primarily UI/UX work. Don't rebuild backend functionality — leverage what exists.

## Common Pitfalls

### Pitfall 1: EventSource Authentication with Bearer Tokens
**What goes wrong:** EventSource API doesn't support custom HTTP headers like `Authorization: Bearer <token>`. Bulk translation endpoint fails with 401 Unauthorized.
**Why it happens:** Admin dashboard stores JWT in localStorage and sends via `Authorization` header in fetch() calls. EventSource constructor doesn't accept headers parameter.
**How to avoid:**
1. **Option A (Recommended):** Use cookie-based authentication. Backend `fetchUser` middleware already supports reading JWT from cookies. Admin login should set JWT as httpOnly cookie in addition to returning token in response body.
2. **Option B:** Pass token as query parameter: `new EventSource('/admin/translate/bulk?token=' + authToken)`. Backend reads from `req.query.token`. Less secure (token in URL logs), but works.
3. **Option C:** Use `fetch()` with `ReadableStream` instead of EventSource for custom headers. More complex to implement SSE parsing manually.
**Warning signs:** 401 errors in browser Network tab when EventSource connects, SSE connection immediately closes with error event.

**Recommended implementation:** Add cookie-based auth to admin login flow if it doesn't exist. Most secure and works seamlessly with EventSource.

### Pitfall 2: SSE Connection Limits (HTTP/1.1)
**What goes wrong:** Browser limits 6 concurrent SSE connections per domain on HTTP/1.1. If admin has 6+ tabs open with active SSE, new bulk translation fails to connect.
**Why it happens:** HTTP/1.1 connection limit is browser-enforced. SSE holds connection open for entire bulk operation (potentially minutes).
**How to avoid:**
1. Ensure production server uses HTTP/2 (supports 100+ concurrent streams per connection). DigitalOcean App Platform defaults to HTTP/2.
2. Close previous EventSource connections when starting new bulk translation (only one bulk operation should run at a time anyway).
3. Show warning in UI if bulk translation is already running in another tab (use `localStorage` flag).
**Warning signs:** EventSource `onerror` fires immediately, no events received, browser console shows "Failed to load resource" with no HTTP status.

**Check HTTP version:** Open DevTools Network tab → Headers → check "Protocol" column. Should show "h2" (HTTP/2) in production.

### Pitfall 3: Progress UI Not Updating During Long Pauses
**What goes wrong:** Progress indicator freezes for 30+ seconds between updates, user thinks tool crashed.
**Why it happens:** Backend sends SSE keepalive comment (`: keepalive\n\n`) every 30 seconds to prevent proxy timeouts, but no UI update occurs. Long product descriptions take >30 seconds to translate, causing gap in progress events.
**How to avoid:**
1. Backend already sends keepalive comments. Don't need to change backend.
2. Add "heartbeat" visual indicator in UI: spinning icon or "Processing..." text that shows even without progress events.
3. Show last successful product name so UI doesn't appear frozen: "Last completed: Beaded Necklace (3/94)" remains visible even if current product takes 60 seconds.
**Warning signs:** User reports thinking tool crashed, manually refreshes page mid-translation, loses progress.

**UI pattern:** Combine static progress text with animated spinner: "Translating product 47/94... ⏳" (spinner keeps animating even without new events).

### Pitfall 4: Failed Products List Grows Too Large for UI
**What goes wrong:** If 50+ products fail (e.g., API quota exceeded), showing all 50 product names in UI overflows viewport, creates bad UX.
**Why it happens:** Displaying full list of `failedProducts` array without pagination or truncation.
**How to avoid:**
1. Show summary count: "17 products failed" instead of listing all names.
2. Offer "View Failed Products" expandable section with scrollable list.
3. If >10 failures, show first 10 + "... and 7 more" with "Show All" button.
4. Provide "Export Failed List" button to download CSV of failed products for debugging.
**Warning signs:** UI vertical scrolling becomes excessive, failed products section pushes completion button off-screen.

**Recommended UI:** Summary count by default, expandable details for power users who need to debug specific failures.

### Pitfall 5: Cache Invalidation Not Triggered After Bulk Translation
**What goes wrong:** Products translated successfully but customer-facing site still shows untranslated English fallback on /he/ URLs because cache wasn't invalidated.
**Why it happens:** Forgetting to call `invalidateBulkProducts()` after bulk translation completes.
**How to avoid:** Backend endpoint should call cache invalidation automatically. Check `POST /admin/translate/bulk` endpoint — does it call `invalidateBulkProducts(productSlugs, categorySlugs)` after completing?
**Warning signs:** Bulk translation completes, admin dashboard shows "Bilingual" badges, but product pages still show English on /he/ URLs. Hard refresh (Ctrl+F5) shows Hebrew translation, proving cache issue.

**Current status:** Phase 28 verification report doesn't mention cache invalidation in bulk endpoint. **This is a gap.** Backend bulk endpoint should be updated to call `invalidateBulkProducts()` on completion, passing array of translated product slugs and affected category slugs.

## Code Examples

Verified patterns from official sources and existing codebase:

### EventSource SSE Connection with Auth
```javascript
// Source: Current admin codebase pattern (fetch with auth)
// Adapted for EventSource limitations

// Get auth token from localStorage (existing admin pattern)
const authToken = localStorage.getItem('auth-token');

// EventSource with query param auth (Option B from Pitfall 1)
const eventSource = new EventSource(
  `${API_URL}/admin/translate/bulk?token=${encodeURIComponent(authToken)}`
);

// Alternative: Cookie-based auth (Option A - recommended)
// Assumes login endpoint sets httpOnly cookie
const eventSource = new EventSource(
  `${API_URL}/admin/translate/bulk`,
  { withCredentials: true } // Sends cookies
);
```

### Complete Bulk Translation UI Flow
```javascript
// Source: Combination of existing admin patterns + SSE best practices

class BulkTranslationTool {
  constructor() {
    this.eventSource = null;
    this.stats = { success: 0, failed: 0, skipped: 0 };
    this.failedProducts = [];
  }

  start() {
    // Reset UI
    this.stats = { success: 0, failed: 0, skipped: 0 };
    this.failedProducts = [];
    document.querySelector('.bulk-translate-progress').style.display = 'block';
    document.querySelector('.bulk-translate-summary').style.display = 'none';

    // Create EventSource (adjust for auth method)
    const authToken = localStorage.getItem('auth-token');
    this.eventSource = new EventSource(
      `${API_URL}/admin/translate/bulk?token=${encodeURIComponent(authToken)}`
    );

    // Event listeners
    this.eventSource.addEventListener('start', (e) => this.onStart(e));
    this.eventSource.addEventListener('progress', (e) => this.onProgress(e));
    this.eventSource.addEventListener('success', (e) => this.onSuccess(e));
    this.eventSource.addEventListener('error', (e) => this.onError(e));
    this.eventSource.addEventListener('complete', (e) => this.onComplete(e));
    this.eventSource.onerror = (err) => this.onConnectionError(err);

    // Cancel button
    document.querySelector('.btn-cancel-translation').onclick = () => this.cancel();
  }

  onStart(event) {
    const { total } = JSON.parse(event.data);
    this.totalProducts = total;
    document.querySelector('.progress-text').textContent =
      `Starting bulk translation: ${total} products...`;
  }

  onProgress(event) {
    const { current, total, productName } = JSON.parse(event.data);

    // Update progress bar
    const percentage = Math.round((current / total) * 100);
    document.querySelector('.progress-bar').style.width = percentage + '%';

    // Update text (use textContent for XSS safety)
    document.querySelector('.progress-text').textContent =
      `Translating product ${current}/${total}...`;
    document.querySelector('#current-product-name').textContent = productName;
  }

  onSuccess(event) {
    this.stats.success++;
    document.querySelector('#count-success').textContent = this.stats.success;
  }

  onError(event) {
    const data = JSON.parse(event.data);
    this.stats.failed++;
    this.failedProducts.push(data);
    document.querySelector('#count-failed').textContent = this.stats.failed;
  }

  onComplete(event) {
    const { translated, failed, skipped } = JSON.parse(event.data);
    this.eventSource.close();

    // Hide progress, show summary
    document.querySelector('.bulk-translate-progress').style.display = 'none';
    document.querySelector('.bulk-translate-summary').style.display = 'block';

    // Update summary
    document.querySelector('#summary-translated').textContent = translated;
    document.querySelector('#summary-failed').textContent = failed;

    // Show retry button if failures
    if (failed > 0) {
      document.querySelector('.btn-retry-failed').style.display = 'block';
    }

    // Toast notification (existing Toastify pattern)
    Toastify({
      text: `Bulk translation complete: ${translated} translated, ${failed} failed`,
      duration: 6000,
      gravity: 'top',
      position: 'right',
      backgroundColor: failed > 0 ? '#f39c12' : '#27ae60',
    }).showToast();
  }

  onConnectionError(err) {
    console.error('SSE connection error:', err);
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Show error message
    Toastify({
      text: 'Connection lost. Please retry bulk translation.',
      duration: 8000,
      gravity: 'top',
      position: 'right',
      backgroundColor: '#e74c3c',
    }).showToast();
  }

  cancel() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Hide progress UI
    document.querySelector('.bulk-translate-progress').style.display = 'none';

    Toastify({
      text: 'Bulk translation cancelled',
      duration: 3000,
      backgroundColor: '#95a5a6',
    }).showToast();
  }
}

// Usage in BisliView.js
const bulkTranslator = new BulkTranslationTool();

// Add to admin page render
function renderBulkTranslatePage() {
  return `
    <div class="bulk-translate-container">
      <h2>Bulk Translation Tool</h2>
      <p>Translate all products missing Hebrew translations in one batch operation.</p>

      <button class="btn-start-bulk-translation">Start Bulk Translation</button>

      <div class="bulk-translate-progress" style="display: none;">
        <!-- Progress UI (see Pattern 2) -->
      </div>

      <div class="bulk-translate-summary" style="display: none;">
        <!-- Summary UI (see Pattern 2) -->
      </div>
    </div>
  `;
}

// Wire up event listeners after render
document.querySelector('.btn-start-bulk-translation').addEventListener('click', () => {
  if (confirm('Translate all products missing Hebrew translations? This may take several minutes.')) {
    bulkTranslator.start();
  }
});
```

### Progress Bar CSS (matches existing admin styles)
```css
/* Source: Existing admin spinner/loading patterns from bambaYafa-desktop.css */
/* Adapted for horizontal progress bar */

.bulk-translate-progress {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f9f9f9;
}

.progress-bar-container {
  width: 100%;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.3s ease;
  border-radius: 12px;
}

.progress-text {
  font-size: 14px;
  color: #555;
  margin: 0.5rem 0;
}

.current-product {
  font-size: 13px;
  color: #777;
  font-style: italic;
}

.progress-stats {
  display: flex;
  gap: 1.5rem;
  margin: 1rem 0;
  font-size: 14px;
}

.stat-success { color: #27ae60; }
.stat-failed { color: #e74c3c; }
.stat-skipped { color: #95a5a6; }

.btn-cancel-translation {
  background: #e74c3c;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancel-translation:hover {
  background: #c0392b;
}

/* Summary section */
.bulk-translate-summary {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 1px solid #27ae60;
  border-radius: 4px;
  background: #eafaf1;
}

.bulk-translate-summary h3 {
  color: #27ae60;
  margin-top: 0;
}

.btn-retry-failed {
  background: #f39c12;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
}

.btn-retry-failed:hover {
  background: #e67e22;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual product-by-product translation in admin forms | Bulk translation tool with progress indicator | Phase 32 (this phase) | Reduces translation time from hours to minutes for ~94 products |
| Polling for progress updates | Server-Sent Events (SSE) | Industry standard since ~2015, adopted in Phase 28 | Real-time progress, lower server load, simpler than WebSocket |
| HTTP/1.1 connection limits (6 SSE max) | HTTP/2 multiplexing (100+ streams) | HTTP/2 standard since 2015, widely adopted 2020+ | Eliminates SSE connection limit concerns for modern servers |
| Translate buttons on individual form fields | Bulk translation API endpoint | Phase 28 (2026-02-15) | Foundation for bulk tooling, SSE streaming already implemented |

**Deprecated/outdated:**
- **Polling for long-running operations:** SSE is standard for one-way server→client streaming. Polling wastes requests and adds latency.
- **Custom SSE parsing with fetch() ReadableStream:** EventSource API is native, automatic reconnection, simpler than manual parsing. Only use ReadableStream if you need custom headers and can't use cookie auth.
- **Blocking UI during bulk operations:** Modern admin dashboards keep UI responsive, show progress in-page or modal. Never disable entire interface.

## Open Questions

1. **Authentication method for EventSource**
   - What we know: EventSource doesn't support Authorization header. Backend supports both cookie and header auth.
   - What's unclear: Does admin login already set JWT as httpOnly cookie, or only returns in response body?
   - Recommendation: Check admin login endpoint. If cookie not set, add cookie-based auth for EventSource compatibility. Fallback to query param if cookie auth not feasible.

2. **Cache invalidation in bulk endpoint**
   - What we know: Phase 31 implemented `invalidateBulkProducts()` utility. Phase 28 verification doesn't mention cache invalidation in bulk endpoint.
   - What's unclear: Does `POST /admin/translate/bulk` call cache invalidation on completion?
   - Recommendation: Verify backend code. If not present, add `invalidateBulkProducts(translatedSlugs, affectedCategories)` call after bulk translation completes. This prevents stale cache serving untranslated content.

3. **Handling large product counts (future-proofing)**
   - What we know: Current product count is ~94 products. Bulk endpoint processes all in one SSE stream.
   - What's unclear: If product count grows to 500+, will single SSE stream handle well, or should we implement batching (e.g., translate 100 at a time)?
   - Recommendation: Current approach sufficient for <200 products. If future growth expected, design UI to support batched translation (e.g., "Translate Category" button that processes one category at a time). Backend already has 100ms delay between products to respect API limits.

4. **Failed product retry granularity**
   - What we know: Backend bulk endpoint naturally skips already-translated products (filters in query). "Retry Failed" can just call same endpoint again.
   - What's unclear: Should retry be automatic (e.g., one retry per failed product inline during bulk), or manual button after completion?
   - Recommendation: Manual retry after completion is safer (prevents infinite loops if API is down). Backend already has retry logic for transient errors per product (3 attempts with backoff). Bulk-level retry should be user-initiated.

## Sources

### Primary (HIGH confidence)
- Backend codebase: `backend/services/translationService.js` (Phase 28) — Translation service with caching and retry logic
- Backend codebase: `backend/index.js` lines 3199-3359 (Phase 28) — POST /admin/translate/bulk endpoint with SSE streaming
- Backend codebase: `backend/cache/invalidation.js` (Phase 31) — `invalidateBulkProducts()` utility
- Admin codebase: `admin/BisliView.js` — Existing admin SPA structure, Toastify usage, auth token patterns
- Admin codebase: `admin/bambaYafa-desktop.css` — Existing spinner and loading UI patterns
- Google Cloud Translation API Documentation: [Quotas and limits](https://docs.cloud.google.com/translate/quotas) (Updated 2026-02-12) — Rate limits: 6,000 requests/min, 6M characters/min, 5K chars/request recommended
- MDN Web Docs: [Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — EventSource API reference, event format, error handling

### Secondary (MEDIUM confidence)
- Medium: [Implementation of Server-Sent Events and EventSource- Live Progress Indicator](https://medium.com/codex/implementation-of-server-sent-events-and-eventsource-live-progress-indicator-using-react-and-723596f35225) — SSE progress indicator patterns
- JavaScript.info: [Server Sent Events](https://javascript.info/server-sent-events) — SSE reconnection behavior and keepalive
- HPE Design System: [Toast notifications](https://design-system.hpe.design/templates/toast-notifications) — Toast notification UX patterns: max 3 toasts, dismiss after 6 seconds
- Refine.dev: [Using React Hot Toast as a Notification Provider](https://refine.dev/blog/react-hot-toast/) — Notification types (success, error, progress), centralized management
- Eleken: [Bulk action UX: 8 design guidelines](https://www.eleken.co/bulk-actions-ux) — Bulk operation UI patterns: progress indicators, success/failure counts, list failed items
- Carbon Design System: [Notification pattern](https://carbondesignsystem.com/patterns/notification-pattern/) — Notification severity levels and timing

### Tertiary (LOW confidence)
- GitHub: [reconnecting-eventsource](https://github.com/fanout/reconnecting-eventsource) — Wrapper for auto-reconnect on HTTP errors (not needed for short-lived operations, but reference if requirements change)
- Discuss Elastic Stack: [Retrying individual bulk actions](https://discuss.elastic.co/t/retrying-individual-bulk-actions-that-failed-or-were-rejected-by-the-previous-bulk-request/138419) — Bulk operation retry patterns: track failed items, retry only failures

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — EventSource is native browser API, Toastify already integrated, Google Translate API proven in Phase 28
- Architecture: HIGH — SSE endpoint exists, cache utilities ready, only UI layer needs building
- Pitfalls: MEDIUM — EventSource auth limitation documented but workaround strategies need testing; cache invalidation gap needs verification

**Research date:** 2026-02-16
**Valid until:** 60 days (April 2026) — EventSource API is stable, Google Cloud Translation API v3 is mature, admin dashboard patterns unlikely to change
