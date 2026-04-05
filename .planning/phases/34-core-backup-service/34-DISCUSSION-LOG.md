# Phase 34: Core Backup Service - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 34-core-backup-service
**Areas discussed:** Backup execution approach, Schedule timezone, Structured log format, Failure & retry behavior

---

## Backup Execution Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Archive + gzip flag | mongodump --archive --gzip pipes a single .archive.gz stream. No temp file, no disk space needed. Matches .archive.gz naming in success criteria. | ✓ |
| Archive to temp file, then upload | mongodump --archive=./tmp/backup.archive.gz writes to local disk first, then uploads. Gives exact file size before upload, allows retry. | |
| You decide | Claude picks based on App Platform constraints. | |

**User's choice:** Archive + gzip flag (streaming, no temp file)
**Notes:** None

### Follow-up: Upload Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Buffer in memory, then upload | Capture stdout into Buffer, then putObject. Gives exact file size, ~10MB won't stress memory. | ✓ |
| True streaming (pipe to S3) | Pipe stdout directly into S3 multipart upload. Zero memory overhead but more complex. | |
| You decide | Claude picks based on DB size and memory constraints. | |

**User's choice:** Buffer in memory, then upload
**Notes:** None

---

## Schedule Timezone

| Option | Description | Selected |
|--------|-------------|----------|
| Israel time (Asia/Jerusalem) | Consistent with exchange rate job. User thinks in local time. | ✓ |
| UTC | Server-neutral, no DST shifts. Requires mental conversion. | |

**User's choice:** Israel time (Asia/Jerusalem)
**Notes:** None

### Follow-up: Cron Configurability

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded | 03:00 AM hardcoded. Simpler. Matches exchangeRateJob.js pattern. | ✓ |
| Env var override | Default 03:00 AM, overridable with BACKUP_CRON_SCHEDULE. More flexible. | |

**User's choice:** Hardcoded
**Notes:** None

---

## Structured Log Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON log line | Single JSON line per run. Machine-parseable, Phase 35 can parse directly into backup_logs. | ✓ |
| Formatted console lines | Human-readable multi-line output like exchange rate job. Harder for Phase 35 to parse. | |
| Return object (not just logging) | Function returns result object, caller decides how to log. | |

**User's choice:** JSON log line
**Notes:** None

### Follow-up: Return Value

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, return object too | runBackup() returns result AND logs JSON. Phase 35 endpoint can return it directly. | ✓ |
| Log only, Phase 35 decides | Phase 34 only logs. Phase 35 adds return value later. | |

**User's choice:** Yes, return object too
**Notes:** None

---

## Failure & Retry Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Log failure, no retry | Log error as JSON with status:'failed'. No automatic retry. Next run in 24h or manual trigger (Phase 35). | ✓ |
| Retry once after 5 minutes | On failure, wait 5min and try once more. Covers transient network issues. | |
| You decide | Claude picks based on operational risk. | |

**User's choice:** Log failure, no retry
**Notes:** None

### Follow-up: Retention Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, backup success | Backup succeeded = data is safe. Retention failure logged as warning. Old backups lingering is not data loss. | ✓ |
| Report as partial failure | status:'partial'. More honest but complicates alerting logic. | |

**User's choice:** Yes, backup success (retention failure is separate warning)
**Notes:** None

---

## Claude's Discretion

- Service file structure (single file or split)
- S3 client initialization pattern
- mongodump child process spawning details
- Retention cleanup implementation
- Exact JSON field names (as long as MON-01 fields covered)

## Deferred Ideas

None — discussion stayed within phase scope
