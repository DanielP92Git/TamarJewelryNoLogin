---
status: partial
phase: 34-core-backup-service
source: [34-VERIFICATION.md]
started: 2026-04-07T00:00:00Z
updated: 2026-04-07T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Production cron execution
expected: Deploy and confirm the 03:00 AM Israel time cron fires with a real mongodump, producing a `[backup]` JSON log entry with `status:'success'` and non-zero `sizeBytes`
result: [pending]

### 2. Spaces bucket file verification
expected: Confirm the `.archive.gz` file actually lands in the DigitalOcean Spaces bucket (tamar-jewelry-backups, ams3 region) after cron fires
result: [pending]

### 3. Retention cleanup over time
expected: After 15+ daily runs, confirm surplus backups beyond `BACKUP_RETENTION_COUNT` (default 14) are actually deleted from the bucket
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
