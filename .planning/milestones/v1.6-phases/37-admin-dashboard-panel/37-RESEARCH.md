# Phase 37: Admin Dashboard Panel - Research

**Researched:** 2026-04-08
**Domain:** Admin SPA frontend (vanilla JS) — backup UI panel, modal, table, status card
**Confidence:** HIGH

## Summary

Phase 37 is a pure frontend change to the existing admin SPA (`admin/BisliView.js`, `admin/index.html`, `admin/bambaYafa-desktop.css`). No new backend endpoints are needed — the three backup API endpoints from Phases 35–36 (`POST /admin/backup`, `GET /admin/backups`, `POST /admin/restore/:key`) are already complete. The implementation follows the established BisliView.js functional pattern: add a sidebar nav item, add a page render function, wire it in `initializeEventHandlers()`, and extend `setActiveNav()`.

The key design complexity is the restore modal. It must support three visual states (confirm → in-progress → success/error) and must lock itself closed during the restore operation. The existing `<dialog>` pattern (`initProductPreviewModal()` / `openProductPreview()`) is the direct reference implementation — the restore modal should follow the same `document.createElement('dialog')`, `.showModal()`, and focus-trap approach, with additional state transitions.

The summary status card + "Run Backup Now" button is straightforward: a compact row showing last backup time, status badge, size, and an action button on the right — built from existing `.card`, `.badge--success`/`.badge--danger`, and `.btn` classes. No new design work needed.

**Primary recommendation:** Build the backup page render function as a single `renderBackupsPage()` function using `clear()` + `pageContent.innerHTML`, following the exact pattern of `renderBulkTranslatePage()`. Build the restore modal as a standalone `openRestoreModal(backup)` function parallel to `openProductPreview()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New sidebar section called "System" added below the existing "Tools" section, containing a "Backups" nav item. Follows the existing `nav__section` / `nav__item` pattern in `admin/index.html`.
- **D-02:** Products List remains the default landing page on login. Backups page is accessed via sidebar navigation only.
- **D-03:** Breadcrumb text: "System / Backups" when viewing the backup panel. Extend `setActiveNav()` in BisliView.js to handle the new "backups" state.
- **D-04:** No backup status indicator in the sidebar. Status is visible once the admin navigates to the Backups page.
- **D-05:** Backup history displayed as a data table with columns: Date/Time, Size, Status, Type (Cron/Manual/Restore), Actions. Consumes `GET /admin/backups` response.
- **D-06:** Summary status card above the table showing: last successful backup time, status badge (green success / red failed), file size. Always visible without scrolling (satisfies success criteria #2).
- **D-07:** Failed backup entries show a red "Failed" status badge in the Status column. Error details shown via tooltip on hover/click. Row styling stays normal — only the badge draws attention.
- **D-08:** All entry types (cron, manual, restore) shown in one unified table, distinguished by the Type column. No separate tabs or filtering.
- **D-09:** "Run Backup Now" button placed inside the summary status card, positioned at the right side next to the last backup info. Prominent and always visible.
- **D-10:** While backup runs: button disabled with spinner icon, text changes to "Running...". On success: Toastify toast "Backup completed (X MB, Xs)", table refreshes with new entry, summary card updates. Button re-enables.
- **D-11:** On backup failure: red Toastify toast with error message. Button re-enables so admin can retry. No modal or blocking UI for failures.
- **D-12:** If API returns 409 (operation in progress), show toast explaining another operation is running. Button stays disabled until next refresh.
- **D-13:** Each successful backup row has a "Restore" button in the Actions column. Only shown for rows with `status=success` AND `trigger !== 'restore'`. Failed backups and restore log entries have no restore button.
- **D-14:** Clicking "Restore" opens a modal dialog with: backup details (date, size), warning about data overwrite, note that a safety backup will be created first, and a text input requiring the admin to type "RESTORE" exactly. Submit button disabled until exact match. Red/danger styling on the modal.
- **D-15:** During restore: modal stays open, content replaced with spinner and "Restoring database... Please wait, do not close this page." Prevent closing (no X button, no backdrop click dismiss).
- **D-16:** On restore success: modal transitions to success state showing "Restore Complete", the pre-restore backup filename, and duration. "Done" button closes modal and refreshes the table.
- **D-17:** On restore failure: modal transitions to error state with red styling, error message, failed step, reassurance that database was not changed (if pre-backup step failed), pre-restore backup filename (if created), and a "Close" button. No auto-dismiss.

### Claude's Discretion

- CSS styling details (colors, spacing, fonts) — follow existing admin dashboard patterns in `bambaYafa-desktop.css`
- Sidebar icon choice for the Backups nav item (SVG inline or existing icon asset)
- Table date/time formatting (relative vs absolute, locale-aware)
- File size formatting (human-readable MB/KB)
- Error tooltip implementation (native title vs custom tooltip)
- Modal implementation approach (custom DOM modal vs existing pattern in BisliView.js)
- Whether to show "Next scheduled: ~03:00" in summary card (depends on cron schedule availability from API)
- Toastify configuration (duration, position, colors) — follow existing usage in BisliView.js

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-02 | Admin dashboard displays backup panel (list backups, trigger, view status) | All three API endpoints verified in `backend/routes/backup.js`. UI pattern established by existing card/table/badge/modal system in BisliView.js and bambaYafa-desktop.css. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native browser `<dialog>` | Built-in | Restore modal — accessibility, ESC key, focus trap, backdrop | Already used for product preview modal (Phase 8). No additional dependency. |
| Toastify JS | CDN (already loaded) | Success/error toast notifications | Already loaded in `admin/index.html` via CDN. Used throughout BisliView.js. |
| Vanilla JS fetch API | Built-in | API calls to backup endpoints | Established pattern — `apiFetch()` wrapper + `localStorage.getItem('auth-token')` header |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Intl.DateTimeFormat` | Built-in browser API | Date/time formatting for backup timestamps | Format `lastModified` field from API — locale-aware, no library needed |
| CSS `@keyframes spin` | Already in CSS | Button spinner animation during backup/restore | Reuse existing keyframe already defined in `bambaYafa-desktop.css` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` | Div-based overlay | Native dialog provides free accessibility, ESC handling, and `.showModal()` focus lock; already used in codebase |
| `Intl.DateTimeFormat` | moment.js / date-fns | No dependency needed; built-in formatting is sufficient for date + time display |
| Native `title` attribute tooltip | Custom tooltip div | Native title is zero-code; custom tooltip needed only if styling is required |

**Installation:** No new packages required. All dependencies are already present.

## Architecture Patterns

### Files Modified

```
admin/
├── index.html         # Add "System" nav section + "Backups" nav__item button
├── BisliView.js       # Add backup page render, restore modal, event wiring
└── bambaYafa-desktop.css  # Add backup-specific CSS classes
```

### Pattern 1: Sidebar Nav Section Addition
**What:** New `nav__section` block in `admin/index.html` sidebar, below the existing "Tools" section.
**When to use:** Adding any new top-level page to the admin SPA.
**Example:**
```html
<!-- Source: admin/index.html — existing Tools section as template -->
<div class="nav__section">
  <div class="nav__label">System</div>
  <button type="button" class="nav__item sidebar_backups" data-nav="backups">
    <span class="nav__icon" aria-hidden="true">
      <!-- inline SVG for database/backup icon -->
    </span>
    <span class="nav__text">Backups</span>
  </button>
</div>
```

### Pattern 2: setActiveNav Extension
**What:** Extend `setActiveNav()` with a `"backups"` case that highlights the new sidebar button and sets the breadcrumb.
**When to use:** Every new page in the SPA needs a nav state.
**Example:**
```javascript
// Source: admin/BisliView.js — setActiveNav() function (lines 11-29)
} else if (active === "backups") {
  backupsBtn?.classList.add("is-active");
  if (breadcrumbEl) breadcrumbEl.textContent = "System / Backups";
}
```

### Pattern 3: Page Render Function
**What:** `renderBackupsPage()` calls `clear()`, then sets `pageContent.innerHTML` with the full page markup, then wires event listeners on the rendered DOM.
**When to use:** All SPA pages in BisliView.js follow this pattern.
**Example:**
```javascript
// Source: admin/BisliView.js — renderBulkTranslatePage() pattern (lines 1183-1250)
async function renderBackupsPage() {
  if (!(await checkAuth())) return;
  clear();
  // Show loading state first
  pageContent.innerHTML = `<div class="backups-loading">Loading backup history...</div>`;
  // Fetch data, then render full page
  const data = await fetchBackups();
  pageContent.innerHTML = buildBackupsPageMarkup(data);
  wireBackupsEvents();
}
```

### Pattern 4: Restore Modal with State Transitions
**What:** A `<dialog>` element created dynamically via `document.createElement('dialog')`, opened with `.showModal()`, supporting three content states: confirm, in-progress, success/error.
**When to use:** Multi-step modal flows requiring lock-out during operations.
**Example:**
```javascript
// Source: admin/BisliView.js — initProductPreviewModal() + openProductPreview() (lines 3949-4273)
function openRestoreModal(backup) {
  const dialog = document.createElement('dialog');
  dialog.className = 'restore-confirm-modal';
  dialog.setAttribute('aria-modal', 'true');
  document.body.appendChild(dialog);
  renderRestoreConfirmState(dialog, backup);
  dialog.showModal();
}

function transitionToInProgress(dialog) {
  // Replace content, remove close button, disable backdrop click
  dialog.innerHTML = `...spinner + message...`;
  // No event listener on backdrop during this state
}
```

### Pattern 5: API Call with Auth Header
**What:** All admin API calls use `apiFetch()` with `Authorization: Bearer <token>` header.
**When to use:** Every authenticated endpoint call in BisliView.js.
**Example:**
```javascript
// Source: admin/BisliView.js — consistent pattern throughout file
const res = await apiFetch('/admin/backup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('auth-token'),
  },
});
const data = await res.json();
```

### Pattern 6: Toastify Notifications
**What:** Three helpers already exist — `showSuccessToast()`, `showErrorToast()`, `showInfoToast()`.
**When to use:** All feedback after API operations.
**Example:**
```javascript
// Source: admin/BisliView.js lines 196-238
showSuccessToast('Backup completed (2.4 MB, 3s)');
showErrorToast('Backup failed: connection timeout');
showInfoToast('Another operation is already in progress');
```

### Recommended Backup Page Layout

```
[Summary Status Card]
  Last backup: Jan 15, 2026 3:00 AM  |  [badge: Success]  |  2.4 MB  |  [Run Backup Now]

[Backup History Table]
  Date/Time            | Size    | Status    | Type    | Actions
  Jan 15, 2026 3:00 AM | 2.4 MB  | [Success] | Cron    | [Restore]
  Jan 14, 2026 3:00 AM | 2.4 MB  | [Success] | Manual  | [Restore]
  Jan 13, 2026 3:00 AM | —       | [Failed]  | Cron    | —
```

### Restore Modal State Machine

```
State 1: CONFIRM
  - Backup details (filename, date, size)
  - Warning text + pre-backup note
  - Text input: type "RESTORE" to enable submit
  - [Cancel] [Restore Database] (disabled until input matches)
  - X button + backdrop click = close

State 2: IN-PROGRESS (entered on submit click)
  - Spinner + "Restoring database... Please wait"
  - NO close button
  - Backdrop click does NOT close (remove event listener)
  - ESC disabled (dialog.addEventListener('cancel', e => e.preventDefault()))

State 3a: SUCCESS
  - "Restore Complete" heading
  - Pre-restore backup filename
  - Duration
  - [Done] button → closes modal + refreshes table

State 3b: ERROR
  - Red styling
  - Error message + failed step
  - Context: "Database was not changed" (if failed before restore started)
  - Pre-restore backup filename (if safety backup was created)
  - [Close] button → closes modal (no table refresh needed)
```

### Anti-Patterns to Avoid
- **Polling for backup completion:** The backup API is synchronous — `POST /admin/backup` waits for the operation to finish before responding. Do not add polling.
- **Closing modal on backdrop click during restore:** Must explicitly remove the backdrop click handler and prevent `cancel` event (`e.preventDefault()` on the dialog's `cancel` event) during in-progress state.
- **Using `.close()` on dialog to dismiss during restore:** The dialog must stay open — only the content changes. Never call `dialog.close()` during in-progress state.
- **Duplicating DOM elements:** Follow the `document.getElementById('productPreviewModal')?.remove()` pattern before creating a new dialog to avoid stacking.
- **Using innerHTML on the table row for restore key:** The restore endpoint uses `POST /admin/restore/:key(*)` where the key is the filename (may contain slashes). The `(*)` wildcard is Phase 36's fix — the full filename must be passed as the URL parameter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date string builder | `new Intl.DateTimeFormat(navigator.language, {...}).format(new Date(ts))` | Handles locale, timezone, edge cases |
| File size display | Custom MB calculation | `(bytes / 1048576).toFixed(1) + ' MB'` is fine for simple cases; no library needed | sizeBytes from API is always in bytes |
| Modal accessibility | Custom focus trap from scratch | Reuse the focus-trap pattern from `openProductPreview()` lines 4237-4267 | Already handles Tab/Shift+Tab cycling |
| Spinner CSS | New animation | Reuse existing `@keyframes spin` + `.button-spinner` from `bambaYafa-desktop.css` | Already defined in the stylesheet |
| Toast notifications | Custom notification div | `showSuccessToast()`, `showErrorToast()`, `showInfoToast()` already in BisliView.js | Zero-code reuse |
| Auth header injection | Inline per-call | `apiFetch()` resolves API URL; add header pattern from line 436 | Consistent, handles dev URL resolution |

## API Response Shapes (VERIFIED from source)

### GET /admin/backups response
```javascript
// Source: backend/routes/backup.js lines 155-170
{
  success: true,
  backups: [
    {
      filename: "backup-2026-01-15T03-00-00.tar.gz",
      lastModified: "2026-01-15T03:00:00.000Z",  // null if log-only
      sizeBytes: 2516582,                           // null if log-only
      status: "success" | "failed" | "unknown",
      durationMs: 3120,                             // null if Spaces-only
      error: null | "error message",
      trigger: "cron" | "manual" | "restore" | null,
    }
  ]
}
```

### POST /admin/backup response (success)
```javascript
// Source: backend/routes/backup.js lines 79-89
{
  success: true,
  status: "success" | "failed",
  filename: "backup-2026-01-15T03-00-00.tar.gz",
  sizeBytes: 2516582,
  durationMs: 3120,
  timestamp: "2026-01-15T03:00:00.000Z",
  retentionDeleted: 0,
  error: null,
}
```

### POST /admin/backup response (409 conflict)
```javascript
// Source: backend/routes/backup.js lines 43-48
{ success: false, error: "Backup already in progress" }
// OR
{ success: false, error: "Restore in progress" }
// HTTP status: 409
```

### POST /admin/restore/:key response (success)
```javascript
// Source: backend/routes/backup.js lines 248-250 + backupService result shape
{
  success: true,
  status: "success",
  timestamp: "2026-01-15T...",
  totalMs: 8340,
  preRestoreBackup: "pre-restore-backup-2026-01-15T....tar.gz",
  // ...other result fields spread in
}
```

### POST /admin/restore/:key response (failure)
```javascript
// Source: backend/routes/backup.js lines 245-248
{
  success: false,
  status: "failed",
  error: "error message",
  failedStep: "validation" | "pre-backup" | "download" | "restore",
  preRestoreBackup: null | "filename",
  totalMs: 1200,
}
// HTTP: 404 if failedStep === 'validation', 500 otherwise
```

### Restore key URL encoding note
The restore endpoint route is `/admin/restore/:key(*)` — the `(*)` wildcard allows slashes in the key (filename). The frontend must pass the raw filename as the URL segment. If the filename contains special characters, use `encodeURIComponent()` on each path segment, not the whole path.
[VERIFIED: backend/routes/backup.js line 185]

## Common Pitfalls

### Pitfall 1: Modal ESC key not suppressed during restore
**What goes wrong:** Admin accidentally presses ESC during a restore, dialog closes, no visual feedback about whether restore completed.
**Why it happens:** Native `<dialog>` responds to ESC by default, emitting a `cancel` event then calling `.close()`.
**How to avoid:** Add `dialog.addEventListener('cancel', e => e.preventDefault())` when entering the in-progress state. Remove this listener when transitioning to success/error state (restore is complete, ESC should work again to dismiss).
**Warning signs:** Dialog disappears while spinner is showing.

### Pitfall 2: Backdrop click closes modal during restore
**What goes wrong:** Admin clicks outside the in-progress modal, dialog closes mid-restore.
**Why it happens:** `openProductPreview()` wires `dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); })`. If this pattern is copied without modification, it fires during in-progress state.
**How to avoid:** Use a named function reference `handleBackdropClick` and `removeEventListener` when entering in-progress state. Or set a flag `let isOperationInProgress = false` checked inside the handler.
**Warning signs:** Modal dismisses when clicking outside the modal content area during restore.

### Pitfall 3: "Run Backup Now" button not re-enabled after 409
**What goes wrong:** Button stays permanently disabled if the API returns 409.
**Why it happens:** D-12 says "button stays disabled until next refresh" — but that only applies while the 409 condition persists. If the other operation completes, the user must be able to trigger again without a full page reload.
**How to avoid:** Re-enable the button after a short delay (e.g., show the 409 toast, re-enable button after 5 seconds so the user can retry if the lock cleared).
**Warning signs:** Admin must reload the page to use the backup button after any 409 response.

### Pitfall 4: Table not refreshed after restore modal "Done"
**What goes wrong:** Admin clicks "Done" after successful restore, table still shows old data.
**Why it happens:** D-16 specifies table refresh — easy to forget to call `renderBackupsPage()` or `fetchAndRefreshTable()` inside the "Done" click handler.
**How to avoid:** The "Done" button handler must close the dialog AND call the table refresh function.
**Warning signs:** New pre-restore backup entry and restore log entry not visible until page navigation.

### Pitfall 5: Restore filename URL construction for files with slashes
**What goes wrong:** `POST /admin/restore/backups/myfile.tar.gz` gets routed as `/admin/restore/backups` with `myfile.tar.gz` as a separate segment.
**Why it happens:** Express wildcard `(:key(*))` handles this correctly on the backend, but the frontend must construct the URL properly.
**How to avoid:** Use the raw filename as-is in the URL path: `apiFetch('/admin/restore/' + backup.filename, ...)`. Do NOT double-encode the entire path. The filename from the API response is already the correct key.
**Warning signs:** 404 response from restore endpoint even for valid backup files.

### Pitfall 6: Summary card shows no backup when only failed entries exist
**What goes wrong:** Summary card logic looks for the last "success" entry but the table is empty or all entries are failed.
**Why it happens:** Code assumes `backups[0]` is the last successful backup.
**How to avoid:** Find the last successful backup: `const lastSuccess = backups.find(b => b.status === 'success')`. If `null`, show "No successful backups yet" instead of crashing.
**Warning signs:** JS error when `lastSuccess` is `undefined` and code tries to read `.lastModified`.

### Pitfall 7: DOM selector references stale after table refresh
**What goes wrong:** After `fetchAndRefreshTable()` re-renders the table innerHTML, event listeners attached to old `<tr>` elements no longer fire.
**Why it happens:** Re-rendering replaces the DOM nodes. Old references are garbage.
**How to avoid:** Wire all table event listeners AFTER rendering, not before. Use event delegation on the table container if many rows need listeners, or wire directly inside the render function.
**Warning signs:** Restore buttons in the refreshed table don't open the modal.

## Code Examples

### Date/Time Formatting
```javascript
// [ASSUMED] — standard Intl API, no library needed
function formatBackupDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(navigator.language, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}
```

### File Size Formatting
```javascript
// [ASSUMED] — simple utility, no library needed
function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
```

### Badge HTML for Status Column
```javascript
// Source: admin/bambaYafa-desktop.css lines 859-894 — badge classes already defined
function statusBadge(status) {
  if (status === 'success') return '<span class="badge badge--success">Success</span>';
  if (status === 'failed') return '<span class="badge badge--danger">Failed</span>';
  return '<span class="badge badge--muted">Unknown</span>';
}

function triggerBadge(trigger) {
  if (trigger === 'cron') return '<span class="badge badge--muted">Cron</span>';
  if (trigger === 'manual') return '<span class="badge badge--muted">Manual</span>';
  if (trigger === 'restore') return '<span class="badge badge--warning">Restore</span>';
  return '<span class="badge badge--muted">—</span>';
}
```

### Prevent ESC during restore
```javascript
// [ASSUMED] — standard browser dialog pattern
const preventCancel = (e) => e.preventDefault();
// Enter in-progress state:
dialog.addEventListener('cancel', preventCancel);
// Enter success/error state:
dialog.removeEventListener('cancel', preventCancel);
```

### Refreshing table without full page re-render
```javascript
// Preferred: refresh only the table + summary card sections
async function refreshBackupTable() {
  const data = await fetchBackups();
  const tableSection = document.querySelector('.backups-table-section');
  const summarySection = document.querySelector('.backup-summary-card');
  if (tableSection) tableSection.innerHTML = buildTableMarkup(data.backups);
  if (summarySection) summarySection.innerHTML = buildSummaryMarkup(data.backups);
  wireTableEvents(); // Re-attach restore button listeners
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based inheritance | Functional module pattern | Phase 36 refactor | BisliView.js uses functions, not a class — add `function renderBackupsPage()`, not a method |
| `fetch()` direct | `apiFetch()` wrapper | Added for dev URL resolution | Always use `apiFetch()` to get correct host in dev |
| Hard-coded `API_URL` | Resolved at runtime | Added for dev | `apiFetch()` awaits URL resolution internally |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Intl.DateTimeFormat` with `navigator.language` will display dates in a useful format for the admin | Code Examples | Low — admin is single user, formatting is cosmetic |
| A2 | The `spin` `@keyframes` animation already in the CSS can be reused for the "Running..." button state without adding a new class | Don't Hand-Roll | Low — verified keyframe exists at CSS lines 1032, 1574, 1735; may need a small `.backup-btn-spinner` class |
| A3 | Native `title` attribute is sufficient for error tooltip on failed backup rows | Common Pitfalls | Low — styling is Claude's discretion per CONTEXT.md |

## Open Questions

1. **Next scheduled backup time in summary card**
   - What we know: Cron schedule is defined in the backend job file (node-cron), but the `GET /admin/backups` response does not include a `nextScheduled` field.
   - What's unclear: Whether to show "Next scheduled: ~03:00 UTC" in the summary card.
   - Recommendation: Per CONTEXT.md (discretion item), omit it since the API does not expose this. Add a static note "Daily at 03:00 UTC" only if the cron schedule is visible in the codebase and unlikely to change.

2. **Empty state: No backups at all**
   - What we know: `GET /admin/backups` returns `{ success: true, backups: [] }` when no backups exist.
   - What's unclear: Phase 37 may be implemented before any backup has run in production.
   - Recommendation: Handle the empty state in `buildSummaryMarkup()` — show "No backups yet. Run your first backup." and disable the Restore buttons (none will exist).

## Environment Availability

Step 2.6: SKIPPED — This phase is purely frontend JS/HTML/CSS changes. No external tools, runtimes, or services beyond the browser and existing admin server are required.

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (key absent) — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no automated test framework exists for the admin SPA) |
| Config file | None |
| Quick run command | Open `admin/index.html` against running backend, navigate to Backups page |
| Full suite command | Manual walkthrough of all 4 success criteria |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-02 | Backup panel lists available backups | Manual smoke | Navigate to Backups page, verify table renders with data | N/A |
| ADM-02 | Summary card shows last successful backup | Manual smoke | Verify summary card is visible without scrolling | N/A |
| ADM-02 | Manual backup trigger works | Manual smoke | Click "Run Backup Now", verify spinner → toast → table refresh | N/A |
| ADM-02 | Restore flow with confirmation phrase | Manual smoke | Click Restore, type "RESTORE", verify modal states | N/A |

### Wave 0 Gaps
No automated test infrastructure exists for the admin SPA — all validation is manual. This is consistent with all prior admin SPA phases.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT token from `localStorage.getItem('auth-token')` sent as `Authorization: Bearer` header on all admin API calls — enforced server-side by `requireAdmin` middleware |
| V3 Session Management | no | Stateless JWT; managed by existing auth layer |
| V4 Access Control | yes | All backup/restore endpoints require admin role — enforced in `backend/routes/backup.js` via `fetchUser + requireAdmin` middleware |
| V5 Input Validation | yes | The only user input is the "RESTORE" confirmation phrase — validated client-side (disabled submit until match) and server-side (`req.body.confirm !== 'RESTORE'` check in the route) |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental restore trigger | Tampering | Confirmation phrase ("RESTORE") required in both UI (disabled button) and API (`confirm` body field) — double gate |
| XSS via backup filename in table | Tampering | Use `textContent` not `innerHTML` for filename display, or sanitize before insertion |
| CSRF on restore endpoint | Spoofing | JWT in Authorization header is not automatically sent by browsers (not a cookie), so CSRF is not applicable |
| Stale auth token | Spoofing | `checkAuth()` validates token at page load; existing pattern covers this |

**XSS note on filename rendering:** The `filename` field from the backup listing response is a server-generated timestamp-based string. However, `error` field from failed backups may contain arbitrary text. Use `textContent` assignment or `element.title = error` (not `innerHTML`) when rendering error messages in the table.

## Sources

### Primary (HIGH confidence)
- `backend/routes/backup.js` — All three API endpoint implementations, exact request/response shapes verified directly
- `backend/models/BackupLog.js` — BackupLog schema fields verified
- `admin/BisliView.js` — All patterns (setActiveNav, clear, initializeEventHandlers, init, modal, apiFetch, Toastify helpers) verified directly
- `admin/index.html` — Sidebar HTML structure verified
- `admin/bambaYafa-desktop.css` — CSS variables, badge classes, card classes, btn classes, modal classes, table classes verified

### Secondary (MEDIUM confidence)
- `.planning/phases/37-admin-dashboard-panel/37-CONTEXT.md` — All locked decisions from user discussion

### Tertiary (LOW confidence)
- None — all claims sourced from codebase inspection or CONTEXT.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present, verified in index.html and BisliView.js
- Architecture: HIGH — patterns verified directly from existing BisliView.js functions
- API shapes: HIGH — verified from backup.js route handlers
- Pitfalls: HIGH — identified from direct code inspection of modal pattern and restore endpoint behavior
- CSS classes: HIGH — verified from bambaYafa-desktop.css

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable — no external dependencies to go stale)
