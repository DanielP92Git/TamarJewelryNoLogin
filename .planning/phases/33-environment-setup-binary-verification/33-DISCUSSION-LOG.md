# Phase 33: Environment Setup & Binary Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 33-environment-setup-binary-verification
**Areas discussed:** Scheduling strategy, Backup storage setup, Binary verification method, Environment variable design

---

## Scheduling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| In-process node-cron | Runs inside existing Express process, same pattern as exchangeRateJob.js. Simple, no extra infra. | ✓ |
| App Platform Scheduled Job | Separate container on cron schedule. Better isolation but more infra overhead. | |
| Separate worker process | Second Node.js process for backups. More isolation than in-process, less than Scheduled Jobs. | |

**User's choice:** In-process node-cron (Recommended)
**Notes:** Consistent with existing exchange rate job pattern. Good enough for ~94-product catalog.

---

## Backup Storage Setup

### Bucket Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Separate bucket, different region | Dedicated backup bucket in a different DO region. True off-region redundancy. | ✓ |
| Separate bucket, same region | New bucket in fra1. Logical separation but no geographic redundancy. | |
| Same bucket, backup prefix | Reuse image bucket with backups/ prefix. No isolation or geo redundancy. | |

**User's choice:** Separate bucket, different region (Recommended)

### Region Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Amsterdam (ams3) | Closest alternative to Frankfurt. Low latency, different data center. | ✓ |
| New York (nyc3) | Cross-Atlantic. Maximum geographic separation, higher upload latency. | |
| You decide | Claude picks based on trade-offs. | |

**User's choice:** Amsterdam (ams3) (Recommended)
**Notes:** Low latency uploads (~20ms) with geographic separation from fra1.

---

## Binary Verification Method

| Option | Description | Selected |
|--------|-------------|----------|
| Startup check + admin endpoint | Run mongodump --version at startup and log. Also expose GET /admin/backup-status. Fails loud. | ✓ |
| Startup check only | Version check at startup, log only. Check App Platform logs to verify. | |
| Admin health endpoint only | No startup check. Check binary on demand via endpoint. | |

**User's choice:** Startup check + admin endpoint (Recommended)
**Notes:** Both loud failure on deploy and observable via admin endpoint.

---

## Environment Variable Design

### Credential Separation

| Option | Description | Selected |
|--------|-------------|----------|
| Separate credentials | Dedicated BACKUP_SPACES_KEY/SECRET/ENDPOINT/REGION for backup bucket. Clear separation. | ✓ |
| Reuse existing credentials | Same SPACES_KEY/SECRET, add backup-specific endpoint/region. Fewer secrets. | |
| You decide | Claude picks based on security best practices. | |

**User's choice:** Separate credentials (Recommended)

### Binary Path Default

| Option | Description | Selected |
|--------|-------------|----------|
| Default to PATH lookup | Default: 'mongodump' (relies on PATH). MONGODUMP_PATH available as override. | ✓ |
| Require explicit path | No default. MONGODUMP_PATH must be set or startup fails. | |

**User's choice:** Default to PATH lookup (Recommended)
**Notes:** Simpler config, works if Aptfile installs to standard location.

---

## Claude's Discretion

- Default values for BACKUP_RETENTION_COUNT and BACKUP_SPACES_PREFIX
- Aptfile exact package name and format
- Startup check implementation details
- Admin endpoint response shape

## Deferred Ideas

None — discussion stayed within phase scope.
