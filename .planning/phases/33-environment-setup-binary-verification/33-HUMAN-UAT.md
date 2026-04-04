---
status: partial
phase: 33-environment-setup-binary-verification
source: [33-VERIFICATION.md]
started: 2026-04-04T22:45:00Z
updated: 2026-04-04T22:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. App Platform build installs mongodump via Aptfile
expected: Build log shows Aptfile buildpack installing mongodb-database-tools; runtime startup log shows `[backup] mongodump binary OK: mongodump version 100.x.x`
result: [pending]

### 2. Live /admin/backup-status returns mongodump.found: true
expected: GET /admin/backup-status with admin JWT returns `mongodump.found: true`, `resolvedPath` is non-empty (e.g. `/layers/digitalocean_apt/apt/usr/bin/mongodump`)
result: [pending]

### 3. Atlas IP allowlist permits App Platform container connections
expected: MongoDB Atlas shows no connection-refused errors from App Platform; access list includes App Platform IP range or 0.0.0.0/0
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
