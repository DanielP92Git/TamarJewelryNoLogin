---
phase: 37-admin-dashboard-panel
reviewed: 2026-04-08T23:15:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - admin/BisliView.js
  - admin/bambaYafa-desktop.css
  - admin/index.html
findings:
  critical: 2
  warning: 6
  info: 5
  total: 13
status: issues_found
---

# Phase 37: Code Review Report

**Reviewed:** 2026-04-08T23:15:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the admin dashboard SPA consisting of BisliView.js (6329 lines), bambaYafa-desktop.css (2791 lines), and index.html (122 lines). The codebase implements a full admin panel with product management, backup/restore, bulk translation, and product reorder features.

Key concerns:
- **XSS vulnerability** in product list rendering where user-controlled data (product name) is injected via `innerHTML` without sanitization
- **Auth token leaked in URL** for bulk translation SSE endpoint, exposing it in server logs and browser history
- Inconsistent use of `apiFetch()` vs raw `fetch()` -- some endpoints bypass the API URL resolver, risking broken calls in dev
- Several `console.log` debug statements left in production code
- Duplicate `@keyframes spin` definitions in CSS

## Critical Issues

### CR-01: XSS via Unsanitized Product Name in innerHTML

**File:** `admin/BisliView.js:3086-3091`
**Issue:** Product names from the API are injected directly into HTML via template literals and `innerHTML`. If a product name contains malicious HTML/script (e.g., `<img onerror=alert(1)>`), it will execute in the admin context. The admin dashboard has full write access to all products, making this a privilege escalation risk if product data is ever tainted (e.g., via a compromised API or database injection).

Affected lines include:
- Line 3086-3091: `item.name` used in `alt` attribute and `row__title` div
- Line 3091: `${item.name}` in product row rendering
- Line 4524: Product name in preview modal data attributes
- Line 4526: Description in preview modal data attributes

**Fix:**
Use the existing `escapeHtml()` function (defined at line 477) to sanitize all user-controlled strings before inserting them into HTML:
```javascript
// Line 3086 - use escapeHtml for alt attribute and display
<img src="${mainImgSrc}" class="listproduct-product-icon" alt="${escapeHtml(item.name)}" loading="lazy" />
// Line 3091
<div class="row__title">${escapeHtml(item.name)}</div>
```
Apply the same pattern everywhere product names, descriptions, or other user-controlled fields are rendered via `innerHTML` or template literals.

### CR-02: Auth Token Exposed in URL Query Parameter (Bulk Translation SSE)

**File:** `admin/BisliView.js:1713-1714`
**Issue:** The bulk translation feature creates an `EventSource` with the auth token as a URL query parameter: `` `${API_URL}/admin/translate/bulk?token=${encodeURIComponent(authToken)}` ``. This leaks the JWT token into server access logs, browser history, the Referer header, and any network monitoring tools. EventSource does not support custom headers, but this approach is a security risk.

**Fix:**
Use a short-lived, single-use token pattern instead. Have the backend issue a temporary token via a POST endpoint that the frontend calls first:
```javascript
// Step 1: Request a short-lived SSE token via authenticated POST
const tokenRes = await apiFetch('/admin/translate/bulk-token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json',
  },
});
const { sseToken } = await tokenRes.json();

// Step 2: Use the short-lived token for the EventSource
bulkEventSource = new EventSource(
  `${API_URL}/admin/translate/bulk?token=${encodeURIComponent(sseToken)}`
);
```
Alternatively, document the accepted risk if the backend already uses short-lived tokens or same-origin cookies.

## Warnings

### WR-01: Inconsistent API Call Patterns -- Raw fetch() vs apiFetch()

**File:** `admin/BisliView.js` (multiple locations)
**Issue:** The codebase defines `apiFetch()` (line 163) which resolves the correct API base URL in development. However, many API calls use raw `fetch()` with string interpolation of `API_URL` instead. If `resolveApiUrl()` changes `API_URL` after initial assignment, calls that already captured the old value could break. More importantly, the inconsistency makes the codebase fragile and harder to maintain.

Affected lines using raw `fetch()`:
- Line 869: SKU duplicate check
- Line 1370: `/allproducts` in `fetchInfo()`
- Line 1417: `/verify-token` in `checkAuth()`
- Line 1561: `/login` in login handler
- Line 2774: `/batch-update-discount`
- Line 2825: `/remove-discount`
- Line 2859: `/discount-settings`
- Line 3208: `/updateproduct/${productId}/sku`
- Line 3292: `/removeproduct`
- Line 3488: `/removeproduct` in bulk delete
- Line 4648: `/removeproduct` in preview modal delete
- Line 4723: `/getproduct/${productId}`
- Line 4913: `/updateproduct/${productId}`
- Line 4937: `/allproducts` in post-update redirect

**Fix:**
Replace all raw `fetch(\`${API_URL}/...\`)` calls with `apiFetch('/...')`. This ensures consistent URL resolution and a single point of change.

### WR-02: Restore Filename Used in API Path Without Validation

**File:** `admin/BisliView.js:646`
**Issue:** The restore API call constructs the URL as `'/admin/restore/' + filename` where `filename` comes from a `data-filename` attribute on a button (line 340, set from backup data). While the filename originates from the server response, it is stored in the DOM and could be tampered with via browser DevTools. If the filename contains path traversal characters (e.g., `../../etc/passwd`), it could exploit a vulnerable backend endpoint.

**Fix:**
Validate the filename format before making the request:
```javascript
async function executeRestore() {
  // Validate filename format (should be something like backup-2026-04-08T12-00-00.gz)
  if (!/^[\w\-.:]+$/.test(filename)) {
    renderErrorState({ error: 'Invalid backup filename', failedStep: 'validation' });
    return;
  }
  renderInProgressState();
  // ... rest of function
}
```
The backend should also validate the filename, but defense-in-depth on the client prevents unnecessary requests.

### WR-03: Reorder Save Uses /api/ Prefix Inconsistent with Project Convention

**File:** `admin/BisliView.js:2102`
**Issue:** The `saveProductOrder()` function calls `apiFetch("/api/admin/products/reorder", ...)`. Per CLAUDE.md, the backend has no `/api` prefix after the SSR migration. All other endpoints in the file use paths without the `/api/` prefix. This call will likely return a 404 in production unless the `/api`-stripping middleware is in place.

**Fix:**
```javascript
const response = await apiFetch("/admin/products/reorder", {
```

### WR-04: Reorder Save Uses Wrong Auth Header Name

**File:** `admin/BisliView.js:2106`
**Issue:** The reorder save request uses `"auth-token"` as the header name, while every other authenticated endpoint in the file uses `"Authorization": "Bearer ..."` format. The `loadDiscountSettings()` function at line 2861 also uses `"auth-token"`. If the backend middleware expects `Authorization: Bearer <token>`, these requests will fail authentication silently.

**Fix:**
```javascript
const response = await apiFetch("/admin/products/reorder", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("auth-token")}`,
  },
  body: JSON.stringify({
    category: category,
    productIds: productIds,
  }),
});
```
Also fix `loadDiscountSettings()` at line 2861.

### WR-05: Product Delete from Preview Modal Sends _id Instead of Numeric id

**File:** `admin/BisliView.js:4654`
**Issue:** The delete handler in the preview modal sends `{ id: product._id }` (MongoDB ObjectId), while the product list delete handler at line 3298 sends `{ id: productId }` where `productId` comes from `this.dataset.productId` which is set to `item.id` (the numeric id) at line 3124. If the backend `/removeproduct` endpoint expects the numeric `id` field, the preview modal delete will fail.

**Fix:**
Use the same identifier pattern as the product list:
```javascript
body: JSON.stringify({ id: product.id })
```

### WR-06: Missing await on checkAuth() in renderBulkTranslatePage

**File:** `admin/BisliView.js:1620-1621`
**Issue:** The `renderBulkTranslatePage()` function does not call `checkAuth()` before rendering, unlike `renderBackupsPage()` (line 449) and other page renderers. A user with an expired token could access the bulk translate UI and trigger SSE calls that fail with auth errors.

**Fix:**
```javascript
async function renderBulkTranslatePage() {
  if (!(await checkAuth())) return;
  clear();
  // ... rest of function
}
```

## Info

### IN-01: Excessive console.log Statements in addProduct Function

**File:** `admin/BisliView.js:5334-5584`
**Issue:** The `addProduct()` function contains approximately 40 `console.log` statements that appear to be debug artifacts from troubleshooting an upload issue. These pollute the browser console in production and may leak internal details.

**Fix:** Remove or gate behind a `DEBUG` flag, similar to the existing `DEBUG_REORDER` pattern (line 191).

### IN-02: Duplicate @keyframes spin Definition in CSS

**File:** `admin/bambaYafa-desktop.css:1032-1036 and 1574-1578 and 1735-1737`
**Issue:** The `@keyframes spin` animation is defined three times. While browsers handle this gracefully (last definition wins), it indicates copy-paste duplication.

**Fix:** Keep a single `@keyframes spin` definition (the first one at line 1032) and remove the duplicates.

### IN-03: Duplicate ensureProductionUrl Helper Functions

**File:** `admin/BisliView.js:997-1019, 3536-3563, 3607-3634, 4414-4433`
**Issue:** The `ensureProductionUrl()` helper is defined four separate times as nested functions within different scopes, with identical logic each time. This is significant code duplication that makes maintenance error-prone.

**Fix:** Extract a single module-level `ensureProductionUrl(url)` function and reference it from all call sites.

### IN-04: Inline Styles Used Extensively in HTML Templates

**File:** `admin/BisliView.js` (multiple locations, e.g., lines 2433-2438, 3077, 4096-4100)
**Issue:** Many dynamically generated HTML elements use extensive inline `style` attributes rather than CSS classes. This makes styling inconsistent with the well-organized class-based CSS in `bambaYafa-desktop.css` and harder to maintain.

**Fix:** Extract common inline styles to CSS classes in `bambaYafa-desktop.css`. For example, the discount controls (line 2433) and the delete buttons on thumbnails (line 4096-4100) could use dedicated classes.

### IN-05: Legacy Product List Markup Duplicated in updateProduct

**File:** `admin/BisliView.js:4950-5070`
**Issue:** After a successful product update, the `updateProduct()` function renders a completely different (legacy-style) product list with its own inline `<style>` block, separate from the modern `loadProductsPage()` markup. This creates two divergent product list renderings that could confuse users and is difficult to maintain.

**Fix:** After a successful update, simply call `fetchInfo()` (which calls `loadProductsPage`) to render the standard product list, optionally showing a success toast. The current fallback at line 5122 already does this.

---

_Reviewed: 2026-04-08T23:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
