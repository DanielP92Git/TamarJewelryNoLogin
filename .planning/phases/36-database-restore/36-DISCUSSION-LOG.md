# Phase 36: Database Restore - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 36-database-restore
**Areas discussed:** Pre-restore safety, Restore execution, Concurrency & locking, Restore logging, Error handling & reporting

---

## Pre-restore Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-backup before restore | System creates a backup automatically before restoring. Adds ~10-30 seconds but provides a safety net. | ✓ |
| No auto-backup | Admin is responsible for ensuring a recent backup exists. Faster, simpler. | |
| You decide | Claude picks approach. | |

**User's choice:** Auto-backup before restore
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Abort restore | If pre-restore backup fails, cancel restore entirely. | ✓ |
| Warn and continue | Log warning but proceed with restore. | |
| You decide | Claude picks. | |

**User's choice:** Abort restore
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Prefixed name | Name like pre-restore-backup-2026-... Immediately identifiable. | ✓ |
| Same naming as regular | Standard backup-2026-... naming. | |
| You decide | Claude picks. | |

**User's choice:** Prefixed name
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Excluded from retention | Pre-restore backups never auto-deleted. Separate prefix in Spaces. | ✓ |
| Subject to retention | Counts toward 14-backup retention limit. | |
| You decide | Claude decides. | |

**User's choice:** Excluded from retention
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No cooldown | Confirmation gate is sufficient protection. | |
| Cooldown period | Require minutes between restores. | |
| You decide | Claude decides. | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include it | Response includes preRestoreBackup filename. | ✓ |
| No, just log it | Filename logged server-side only. | |
| You decide | Claude decides. | |

**User's choice:** Yes, include preRestoreBackup in response
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No age limit | Any Spaces backup can be restored. | |
| Warn on old backups | Warning if backup older than N days, still allows restore. | |
| You decide | Claude decides. | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Restore Execution

| Option | Description | Selected |
|--------|-------------|----------|
| Download to memory | Buffer entire archive, pipe to mongorestore via stdin. Consistent with Phase 34 pattern. | ✓ |
| Stream from S3 | Pipe S3 stream directly to mongorestore. More complex, overkill for <10MB. | |
| Temp file on disk | Download to temp file, pass path to mongorestore. Requires cleanup. | |
| You decide | Claude picks. | |

**User's choice:** Download to memory
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| --drop flag | Drop collections before restoring. Clean state. | ✓ |
| No --drop (merge) | Restore without dropping. Can leave stale data. | |
| You decide | Claude picks. | |

**User's choice:** --drop flag
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Synchronous | Await completion, return result. Consistent with POST /admin/backup. | ✓ |
| Async with polling | Return 202, poll for status. More complex. | |
| You decide | Claude picks. | |

**User's choice:** Synchronous
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add to backupService.js | Add runRestore() alongside runBackup(). Shares S3 client. | ✓ |
| New restoreService.js | Separate file. Duplicates S3 setup. | |
| You decide | Claude decides. | |

**User's choice:** Add to backupService.js
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add to backup.js | Add restore route to existing backup routes file. | ✓ |
| New restore.js routes | Separate routes file. Duplicates middleware setup. | |
| You decide | Claude decides. | |

**User's choice:** Add to backup.js
**Notes:** None

---

## Concurrency & Locking

| Option | Description | Selected |
|--------|-------------|----------|
| Unified lock | Single lock prevents backup-during-restore and vice versa. | ✓ |
| Separate locks | Independent locks. Could allow overlap. | |
| You decide | Claude picks. | |

**User's choice:** Unified lock
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skip silently | Log warning, skip cron run during restore. | ✓ |
| Fail with log entry | Log a BackupLog entry with status 'skipped'. | |
| You decide | Claude picks. | |

**User's choice:** Skip silently
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level in backup.js | Rename isBackupRunning, keep in same file. | ✓ |
| Shared lock module | Extract to utils/backupLock.js. | |
| You decide | Claude picks. | |

**User's choice:** Module-level in backup.js
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, descriptive message | Different 409 messages per operation type. | ✓ |
| Generic 'operation in progress' | Single generic message. | |
| You decide | Claude decides. | |

**User's choice:** Yes, descriptive message
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| String enum | activeOperation = null \| 'backup' \| 'restore' | ✓ |
| Object with details | { type, startedAt, key } | |
| You decide | Claude picks. | |

**User's choice:** String enum
**Notes:** None

---

## Restore Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Add to BackupLog | Reuse existing model with trigger: 'restore'. | ✓ |
| Separate RestoreLog model | New Mongoose model for restore operations. | |
| No persistence, log only | Console.log structured JSON only. | |
| You decide | Claude picks. | |

**User's choice:** Add to BackupLog
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, alert on failure | Reuse backupAlertService for restore failures. | ✓ |
| Alert on both success and failure | Email for every restore operation. | |
| No email alerts for restore | Admin sees result in API response. | |
| You decide | Claude picks. | |

**User's choice:** Yes, alert on failure
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include it | Add preRestoreBackup field to BackupLog for restore entries. | ✓ |
| No, just the restored file | Only log which backup was restored. | |
| You decide | Claude decides. | |

**User's choice:** Yes, include preRestoreBackup
**Notes:** None

---

## Error Handling & Reporting

| Option | Description | Selected |
|--------|-------------|----------|
| Full detail | Return mongorestore stderr (redacted), which step failed, step timing. Admin is privileged. | ✓ |
| Categorized errors only | Return error category without raw stderr. | |
| You decide | Claude decides. | |

**User's choice:** Full detail
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| No auto-rollback | Log failure, return details, let admin decide. | ✓ |
| Auto-rollback attempt | Auto-restore from pre-restore backup on failure. Risky cascade. | |
| You decide | Claude picks. | |

**User's choice:** No auto-rollback
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step timing | Return downloadMs, preBackupMs, restoreMs, totalMs. | ✓ |
| Total duration only | Just totalMs like backups. | |
| You decide | Claude decides. | |

**User's choice:** Step-by-step timing
**Notes:** None

---

## Claude's Discretion

- Cooldown period between restores (user deferred to Claude)
- Maximum age limit on restorable backups (user deferred to Claude)

## Deferred Ideas

None — discussion stayed within phase scope.
