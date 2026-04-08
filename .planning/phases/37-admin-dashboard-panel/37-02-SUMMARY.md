---
phase: 37-admin-dashboard-panel
plan: 02
subsystem: admin-dashboard
tags: [admin, backup-panel, restore-modal, state-machine, xss-mitigation]
dependency_graph:
  requires: [37-01, backend/routes/backup.js]
  provides: [openRestoreModal, escapeHtml]
  affects: [admin/BisliView.js]
tech_stack:
  added: []
  patterns: [dialog-state-machine, esc-prevention, backdrop-lock, dom-based-html-escape]
key_files:
  created: []
  modified:
    - admin/BisliView.js
key_decisions:
  - Used DOM-based escapeHtml (textContent + innerHTML readback) for XSS mitigation of API-sourced strings (T-37-06)
  - Used isOperationInProgress flag pattern instead of removing/re-adding backdrop click listener (simpler, fewer edge cases)
  - 409 conflict shown as error state with failedStep 'concurrency' rather than a separate state
metrics:
  duration: 109s
  completed: "2026-04-08T19:37:00Z"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 1
---

# Phase 37 Plan 02: Restore Modal State Machine Summary

Restore modal added to admin backup panel with full 4-state machine: confirm (phrase gate), in-progress (locked), success (pre-restore backup + duration), and error (failed step + database context). All API-sourced strings escaped via DOM-based escapeHtml utility.

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add openRestoreModal function with full state machine | f9a81fe | openRestoreModal with 4 states + escapeHtml utility in BisliView.js |
| 2 | Visual and functional verification | PENDING | checkpoint:human-verify -- awaiting human verification |

## Implementation Details

### openRestoreModal Function (admin/BisliView.js)
- Creates `<dialog>` with id `restoreConfirmModal`, class `restore-confirm-modal`
- Removes existing modal before creating new one (prevents stacking per RESEARCH.md pitfall)
- `isOperationInProgress` flag controls backdrop click and ESC behavior
- `preventCancel` named listener added/removed for ESC key suppression

### State 1: Confirm (D-14)
- Warning text: "This will overwrite all current data. A safety backup will be created first."
- Filename displayed in `.mono` span (escaped)
- Input with placeholder "RESTORE", submit disabled until exact match
- Enter key on input triggers submit when value matches
- "Don't Restore" cancel button and X close button

### State 2: In-Progress (D-15)
- Sets `isOperationInProgress = true`
- Adds `cancel` event listener to prevent ESC closing
- Shows `.button-spinner` (36px) + "Restoring database..." + "Please wait, do not close this page."
- No close button, no backdrop dismiss

### State 3a: Success (D-16)
- Clears `isOperationInProgress`, removes ESC prevention listener
- Changes border-top color to green (success)
- Shows pre-restore backup filename (escaped, in `.mono`) and duration in seconds
- "View Backups" button closes dialog then calls `refreshBackupTable()`

### State 3b: Error (D-17)
- Shows error message (escaped) and failed step (escaped)
- Context: "Your database was not changed" for validation/pre-backup failures
- Shows pre-restore backup filename if one was created before failure
- "Close Details" button dismisses modal

### API Integration
- `executeRestore()` calls `apiFetch('/admin/restore/' + filename)` with POST, JSON body `{ confirm: 'RESTORE' }`
- 409 response handled as error state with `failedStep: 'concurrency'`
- Network errors caught and shown as error state with `failedStep: 'network'`

### escapeHtml Utility
- DOM-based approach: creates div, sets `textContent`, reads back `innerHTML`
- Applied to all API-sourced strings: filename, error messages, failedStep, preRestoreBackup

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `openRestoreModal` function present at line 478 with all 4 state render functions
- `escapeHtml` function present at line 471 using `div.textContent = str; return div.innerHTML` pattern
- Confirm state: heading "Restore Database", warning text, input placeholder "RESTORE", disabled submit, "Don't Restore" cancel
- Input handler enables submit only when `confirmInput.value === 'RESTORE'` (exact match)
- In-progress state: `isOperationInProgress = true`, `preventCancel` listener added
- Success state: `preventCancel` removed, "Restore Complete", pre-backup filename in `.mono`, "View Backups" calls `refreshBackupTable()`
- Error state: "Restore Failed", error message, failed step, conditional "Your database was not changed" context
- `executeRestore` calls `apiFetch('/admin/restore/' + filename)` with `body: JSON.stringify({ confirm: 'RESTORE' })`
- `handleBackdropClick` checks `!isOperationInProgress` before `dialog.close()`
- 409 response handled as error state
- Backend tests: not runnable in worktree (vitest module resolution), but no backend files modified (only admin/BisliView.js changed)
- All copywriting matches 37-UI-SPEC.md contract

## Known Stubs

None - all functionality is fully wired. The `openRestoreModal` function that was a stub in Plan 01 is now implemented.

## Threat Surface Review

All threat model mitigations from the plan are implemented:
- T-37-06: `escapeHtml()` applied to all API-sourced strings (filename, error, failedStep, preRestoreBackup) before innerHTML insertion
- T-37-07: Client-side "RESTORE" check is UX gate; server independently validates `req.body.confirm !== 'RESTORE'`
- T-37-08: `isOperationInProgress` flag + `preventCancel` listener suppress ESC; `handleBackdropClick` checks flag
- T-37-09: All restore API calls include `Authorization: Bearer <token>` header
- T-37-10: Server persists BackupLog entry with `trigger: 'restore'` (handled by backend, not this plan)

No new threat surfaces beyond what was documented in the plan's threat model.

## Self-Check: PASSED

- admin/BisliView.js: FOUND
- 37-02-SUMMARY.md: FOUND
- Commit f9a81fe: FOUND
