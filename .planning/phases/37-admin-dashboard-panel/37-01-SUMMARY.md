---
phase: 37-admin-dashboard-panel
plan: 01
subsystem: admin-dashboard
tags: [admin, backup-panel, sidebar, css, ui]
dependency_graph:
  requires: [backend/routes/backup.js]
  provides: [renderBackupsPage, handleBackupTrigger, backup-panel-css]
  affects: [admin/index.html, admin/BisliView.js, admin/bambaYafa-desktop.css]
tech_stack:
  added: []
  patterns: [sidebar-nav-section, page-render-function, inline-table-refresh]
key_files:
  created: []
  modified:
    - admin/index.html
    - admin/BisliView.js
    - admin/bambaYafa-desktop.css
key_decisions:
  - Used native title attribute for error tooltips on failed backup badges (D-07)
  - Restore button delegation to Plan 02 via typeof guard on openRestoreModal
  - 409 handling re-enables button after 5 seconds per D-12 with Pitfall 3 mitigation
metrics:
  duration: 255s
  completed: "2026-04-08T19:30:30Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 37 Plan 01: Admin Dashboard Backup Panel Foundation Summary

Backup panel sidebar navigation, summary status card, backup history table, and manual backup trigger with inline feedback added to the admin dashboard SPA using existing BisliView.js functional patterns and bambaYafa-desktop.css design system.

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add sidebar nav section and all backup panel CSS | 2f58efe | System > Backups nav item in index.html; 350+ lines of CSS for summary card, history table, restore modal (4 states), empty/loading states |
| 2 | Add renderBackupsPage with summary card, data table, and backup trigger logic | 3b64f74 | 11 new functions in BisliView.js: formatBackupDate, formatBytes, statusBadgeHtml, triggerBadgeHtml, fetchBackups, buildSummaryCardHtml, buildBackupTableHtml, handleBackupTrigger, refreshBackupTable, wireBackupsPageEvents, renderBackupsPage; sidebar click handler wired |

## Implementation Details

### Sidebar Navigation (admin/index.html)
- New "System" nav section added after "Tools" section, before closing `</nav>` tag
- Database cylinder SVG icon at 18x18px matching existing icon size pattern
- Class `sidebar_backups` follows existing `sidebar_products-list`, `sidebar_add-products`, `sidebar_bulk-translate` naming convention

### Backup Panel Functions (admin/BisliView.js)
- `setActiveNav("backups")` sets breadcrumb to "System / Backups"
- `renderBackupsPage()` follows renderBulkTranslatePage pattern: checkAuth -> clear -> loading state -> fetch -> render -> wire events
- `buildSummaryCardHtml()` finds last successful backup, handles empty state ("No successful backups yet")
- `buildBackupTableHtml()` renders Date/Time, Size, Status, Type, Actions columns; Restore button only for success entries where trigger !== 'restore'
- `handleBackupTrigger()` disables button with spinner, handles 409 (info toast + 5s re-enable), failure (error toast + re-enable), success (toast with MB/seconds + table refresh)
- `refreshBackupTable()` replaces summary card outerHTML and table section innerHTML, re-wires events
- `wireBackupsPageEvents()` delegates restore buttons to Plan 02's `openRestoreModal` with typeof guard

### CSS (admin/bambaYafa-desktop.css)
- Summary card: `.backup-summary-card` flex layout with info, badge, and action button
- History table: `.backups-table`, `.backups-table-header`, `.backups-table-row` with 5-column grid
- Empty/loading states: `.backups-empty`, `.backups-loading`
- Restore modal: `dialog.restore-confirm-modal` with header, body, footer, plus `.restore-in-progress`, `.restore-success`, `.restore-error` state classes

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- admin/index.html: `sidebar_backups` button inside "System" nav section confirmed
- admin/bambaYafa-desktop.css: All CSS classes verified (summary card, table header/row, dialog modal, restore states)
- admin/BisliView.js: All 11 functions present at expected locations; backupsBtn DOM reference at line 7; setActiveNav "backups" case at line 29; sidebar click handler wired in initializeEventHandlers
- Backend tests: Not runnable in worktree environment (vitest module resolution issue), but no backend files were modified (confirmed via git diff)

## Known Stubs

- `wireBackupsPageEvents()` delegates restore button clicks to `openRestoreModal()` which does not exist yet -- this is intentional and will be implemented in Plan 02 (guarded by `typeof openRestoreModal === 'function'` check)

## Threat Surface Review

All threat model mitigations from the plan are implemented:
- T-37-01: All API calls include Authorization Bearer header from localStorage
- T-37-02: Filenames rendered via innerHTML but are server-generated timestamps; error attribute uses `.replace(/"/g, '&quot;')` for attribute breakout prevention
- T-37-03: Error messages in title attribute (auto-escapes HTML)
- T-37-05: Button disabled immediately on click; server-side 409 provides defense in depth

No new threat surfaces beyond what was documented in the plan's threat model.
