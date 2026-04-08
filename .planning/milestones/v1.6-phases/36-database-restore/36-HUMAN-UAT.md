---
status: blocked
phase: 36-database-restore
source: [36-VERIFICATION.md]
started: "2026-04-08T14:45:00.000Z"
updated: "2026-04-08T14:45:00.000Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end restore against real Atlas cluster
expected: Deploy to App Platform with real MONGO_URL, BACKUP_BUCKET, and BACKUP_SPACES_* credentials. Get a valid backup key from GET /admin/backups. POST /admin/restore/{key} with { "confirm": "RESTORE" } as admin. Confirm HTTP 200 and that the Atlas DB state reflects the restored backup.
result: blocked
blocked_by: server
reason: "Requires production deployment with real Atlas cluster, BACKUP_BUCKET, and BACKUP_SPACES_* credentials. Cannot test locally — no mongodump installed, no backup files in Spaces."

## Summary

total: 1
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps
