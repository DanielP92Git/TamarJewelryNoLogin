# Phase 37: Admin Dashboard Panel - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can view backup status, trigger backups, and initiate a database restore from the existing admin dashboard SPA (`admin/BisliView.js`) without needing SSH access or App Platform log inspection. Consumes existing API endpoints from Phases 35-36 (`POST /admin/backup`, `GET /admin/backups`, `POST /admin/restore/:key`). No new backend endpoints — this phase is purely frontend admin UI.

</domain>

<decisions>
## Implementation Decisions

### Panel Placement & Navigation
- **D-01:** New sidebar section called "System" added below the existing "Tools" section, containing a "Backups" nav item. Follows the existing `nav__section` / `nav__item` pattern in `admin/index.html`.
- **D-02:** Products List remains the default landing page on login. Backups page is accessed via sidebar navigation only.
- **D-03:** Breadcrumb text: "System / Backups" when viewing the backup panel. Extend `setActiveNav()` in BisliView.js to handle the new "backups" state.
- **D-04:** No backup status indicator in the sidebar. Status is visible once the admin navigates to the Backups page.

### Backup List Presentation
- **D-05:** Backup history displayed as a data table with columns: Date/Time, Size, Status, Type (Cron/Manual/Restore), Actions. Consumes `GET /admin/backups` response.
- **D-06:** Summary status card above the table showing: last successful backup time, status badge (green success / red failed), file size. Always visible without scrolling (satisfies success criteria #2).
- **D-07:** Failed backup entries show a red "Failed" status badge in the Status column. Error details shown via tooltip on hover/click. Row styling stays normal — only the badge draws attention.
- **D-08:** All entry types (cron, manual, restore) shown in one unified table, distinguished by the Type column. No separate tabs or filtering.

### Backup Trigger UX
- **D-09:** "Run Backup Now" button placed inside the summary status card, positioned at the right side next to the last backup info. Prominent and always visible.
- **D-10:** While backup runs: button disabled with spinner icon, text changes to "Running...". On success: Toastify toast "Backup completed (X MB, Xs)", table refreshes with new entry, summary card updates. Button re-enables.
- **D-11:** On backup failure: red Toastify toast with error message. Button re-enables so admin can retry. No modal or blocking UI for failures.
- **D-12:** If API returns 409 (operation in progress), show toast explaining another operation is running. Button stays disabled until next refresh.

### Restore Flow UX
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — ADM-02 requirement for this phase
- `.planning/ROADMAP.md` §Phase 37 — Success criteria (4 items) defining done state

### Prior Phase Context
- `.planning/phases/35-manual-trigger-backup-listing-failure-alerting/35-CONTEXT.md` — API design decisions: route structure (D-15), listing response shape (D-12–D-14), concurrency lock (D-17), BackupLog model (D-08–D-11)
- `.planning/phases/36-database-restore/36-CONTEXT.md` — Restore API: confirmation gate (D-10), response shape with timing (D-18–D-20), pre-restore backup (D-01–D-04), unified lock (D-12–D-14)

### Existing PRD
- `backend/backup-prd.md` — Original PRD with architecture overview

### Existing Code — API Endpoints (Phase 35/36 Output)
- `backend/routes/backup.js` — All 3 endpoints: POST `/admin/backup`, GET `/admin/backups`, POST `/admin/restore/:key`. Read this file to understand exact response shapes.
- `backend/services/backupService.js` — `runBackup()` and `runRestore()` return objects. Response shapes flow through to API.
- `backend/models/BackupLog.js` — Mongoose schema showing all available fields

### Existing Code — Admin Dashboard
- `admin/BisliView.js` — Full admin SPA. Navigation pattern (`setActiveNav`), page rendering pattern (`clear()` + innerHTML), event listener setup, Toastify usage, API call pattern
- `admin/index.html` — Sidebar HTML structure with `nav__section` / `nav__item` pattern. New "System" section follows this pattern.
- `admin/bambaYafa-desktop.css` — All admin styling. Examine for existing table, button, card, and modal patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setActiveNav()` in BisliView.js — Extend with "backups" case for sidebar highlighting + breadcrumb
- `clear()` function — Clears `.page-content` before rendering a new page
- Toastify library — Already loaded in admin dashboard for toast notifications
- `API_URL` + `apiRequest()` pattern — Existing authenticated API call mechanism in BisliView.js
- Admin modal pattern — Product preview modal exists in BisliView.js (can reference for structure)

### Established Patterns
- Page rendering: sidebar button click → `setActiveNav()` → render function writes to `pageContent.innerHTML`
- API calls: fetch with auth token from cookie/localStorage
- Notifications: Toastify for success/error feedback
- Sidebar sections: `nav__section` with `nav__label` heading + `nav__item` buttons

### Integration Points
- `admin/index.html` — Add "System" nav section with "Backups" button to sidebar HTML
- `admin/BisliView.js` — Add backup page render function, sidebar click handler, `setActiveNav("backups")` case, restore modal logic
- `admin/bambaYafa-desktop.css` — Add styles for backup table, summary card, restore modal, status badges

</code_context>

<specifics>
## Specific Ideas

- The summary status card + "Run Backup Now" button layout mirrors a dashboard widget pattern — compact, informative, actionable.
- Restore modal must prevent accidental triggers: disabled submit until exact "RESTORE" match, no backdrop dismiss during operation, clear warning text about data overwrite.
- The "Done" button after successful restore refreshes the backup table (which will now show the new pre-restore backup entry and the restore log entry).
- Restore button should not appear on restore-type log entries (would be confusing — "restore from a restore").

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 37-admin-dashboard-panel*
*Context gathered: 2026-04-08*
