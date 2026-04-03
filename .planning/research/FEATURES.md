# Feature Research

**Domain:** MongoDB Backup & Recovery System for Node.js/Express E-commerce (DigitalOcean App Platform)
**Researched:** 2026-04-04
**Confidence:** HIGH (core backup mechanics, platform constraints), MEDIUM (UI patterns, restore UX)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any production backup system must have. Missing these means the system cannot be trusted for real data protection.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automated daily backup via mongodump | Without automation, backups will be skipped; manual-only is not a safety net | LOW | node-cron already installed (exchange rate job); `mongodump --archive --gzip` is the standard invocation |
| Gzip compression of backup archives | Raw mongodump output is large; compression universally expected in production | LOW | `--gzip` flag on mongodump; reduces Spaces storage cost significantly |
| Upload to DigitalOcean Spaces (off-region) | App Platform filesystem is ephemeral — resets on every deploy; local storage cannot persist backups | MEDIUM | Reuse existing `@aws-sdk/client-s3` and Spaces credentials already configured for image uploads; pipe mongodump stdout directly to Spaces to skip local disk entirely |
| Retention policy — auto-delete old backups | Without cleanup, Spaces storage grows unbounded and costs increase | LOW | List objects in Spaces by date prefix, delete objects older than N days; keep last 7-14 backups |
| Backup success/failure logging | Operators need to know if last night's backup ran; silent failure is worse than no backup | LOW | Structured log entry per run: timestamp, status (success/failure), file size, duration, error message; write to existing console logging pattern or dedicated log |
| Manual backup trigger (admin endpoint) | Admin needs on-demand backup before a risky migration or bulk data change | LOW | POST /backups/trigger behind existing JWT admin middleware; executes the same function as scheduled job |
| Database restore from a specific backup | Backups are worthless without a tested restore path | HIGH | `mongorestore --archive --gzip`; download archive from Spaces, stream to mongorestore; require application-level write guard during restore to prevent partial state |

### Differentiators (Competitive Advantage)

Features beyond the minimum — valuable for this specific app, not universally expected in a small-scale backup system.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Admin dashboard backup panel | Ops visibility without SSH access; list available backups, trigger manual backup, see last-run status from admin UI | MEDIUM | New section in existing `admin/BisliView.js`; calls GET /backups (list from Spaces) and POST /backups/trigger; shows filename, timestamp, size for each stored backup |
| Backup history log in MongoDB | Admin can review run history (last 7-30 days, success/fail/size) without reading server logs | MEDIUM | Small `backup_logs` collection; 5-8 fields per entry (timestamp, status, filename, bytes, duration_ms, error); low write volume (1 entry/day) |
| Pre-restore confirmation gate | Restore overwrites live data — require explicit confirmation to prevent accidental triggers | LOW | Frontend confirm dialog + backend validates `{ confirm: "RESTORE" }` in request body; returns 400 if missing |
| Timestamped backup filenames | Human-readable, lexicographically sortable filenames simplify debugging and retention logic | LOW | ISO timestamp in filename: `backup-2026-04-04T02-00-00Z.archive.gz`; sortable without parsing metadata |
| Configurable retention via environment variable | Different environments can use different retention windows without code changes | LOW | `BACKUP_RETENTION_DAYS=14` env var with sensible default of 14; read at job runtime |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Store backup files on local App Platform disk | Simplicity — no S3 integration needed | App Platform filesystem is ephemeral; files destroyed on every deploy or container replacement; 4 GiB hard cap | Pipe mongodump stdout directly to Spaces — no local file written; clean and safe |
| Point-in-time recovery (PITR) with oplog capture | Finer-grained recovery window | Requires MongoDB replica set with oplog access — not available on Atlas M0 or self-managed single-node; significant operational complexity | Daily mongodump is sufficient for a low-write jewelry catalog (~94 products); RPO ~24h and RTO < 2h satisfies stated goal |
| Encrypt backup files before upload | Security hardening | Adds key management complexity (store and rotate encryption keys); DigitalOcean Spaces already provides server-side AES-256 encryption at rest; double encryption adds operational overhead with no meaningful benefit for this threat model | Rely on Spaces server-side encryption; restrict bucket access via Spaces IAM policies |
| Backup to a second cloud provider (AWS S3, GCS) | True 3-2-1 redundancy | Adds second set of credentials, IAM policies, and billing; not needed at current catalog scale | Use a different Spaces region (e.g., NYC vs FRA) as secondary if 3-2-1 is required — same API and SDK |
| Auto-restore on backup failure | Seems defensive | Restore is destructive and overwrites current live data; auto-triggering on failure can cascade a partial failure into total data loss | Alert/log on failure; require explicit human decision to restore |
| Incremental backups (changed documents only) | Storage efficiency | mongodump does not support true incremental backups without replica set oplog access; partial dumps require manual collection-level logic | Full daily dump with gzip is small for ~94 products (estimated < 10 MB compressed); incremental adds complexity without proportional benefit |
| Backup verification via automatic test restore | Best practice | Requires a second MongoDB instance to restore into; over-engineered for current project scale | Log backup file size and mongodump exit code as proxy for backup health; quarterly manual restore test is sufficient |

---

## Feature Dependencies

```
[Automated daily backup]
    └──requires──> [mongodump binary available in App Platform runtime]
    └──requires──> [Spaces credentials in environment variables] (already exist for images)
    └──requires──> [node-cron scheduler] (already installed)

[Direct Spaces upload (no local disk)]
    └──requires──> [AWS SDK / Spaces-compatible S3 client] (already configured)
    └──requires──> [mongodump --archive flag] (stdout piping mode)

[Retention policy]
    └──requires──> [Consistent timestamped backup filenames]
    └──requires──> [Spaces list + delete object operations]

[Database restore]
    └──requires──> [mongorestore binary available in App Platform runtime]
    └──requires──> [Spaces download operation] (reverse of upload)
    └──requires──> [Admin authentication middleware] (already exists)
    └──enhances──> [Pre-restore confirmation gate]

[Manual backup trigger]
    └──requires──> [Same backup job function as automated backup]
    └──requires──> [Admin authentication middleware] (already exists)

[Admin dashboard backup panel]
    └──requires──> [GET /backups endpoint] (lists backups from Spaces)
    └──requires──> [POST /backups/trigger endpoint]
    └──enhances──> [Backup history log]

[Backup history log]
    └──requires──> [Backup success/failure logging]
    └──enhances──> [Admin dashboard backup panel]

[Pre-restore confirmation gate]
    └──enhances──> [Database restore]
    └──conflicts──> [Auto-restore on backup failure] (anti-feature)
```

### Dependency Notes

- **mongodump/mongorestore binary availability is the critical unknown**: App Platform runs containers; MongoDB Database Tools must be installable via `apt-get` in a Dockerfile or available pre-installed in the runtime image. This must be verified before implementation begins — it gates every other feature.
- **Spaces credentials already exist**: The app already uploads images to DigitalOcean Spaces. `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET`, and `DO_SPACES_ENDPOINT` are already configured. A `backups/` prefix within the same or a separate bucket reuses existing infrastructure without new credentials.
- **node-cron already installed**: The exchange rate job (`backend/jobs/exchangeRateJob.js`) uses node-cron already. The backup scheduler follows the identical pattern with zero new dependencies.
- **Retention policy requires consistent naming**: If backup filenames are not consistently date-prefixed and lexicographically sortable, listing and deleting by age becomes fragile. ISO timestamps in filenames are the standard pattern.
- **Restore requires write guard**: Restoring while the application is accepting writes can produce partial state. A simple in-memory flag or environment variable can block incoming write requests during the restore window.

---

## MVP Definition

### Launch With (v1.6 — this milestone)

Minimum set to achieve the milestone goal: RTO < 2 hours, automated off-region backups, no permanent data loss.

- [ ] Automated daily backup scheduled via node-cron — core data protection
- [ ] mongodump with --archive --gzip piped directly to DigitalOcean Spaces — required given ephemeral App Platform filesystem
- [ ] Timestamped backup filenames in Spaces — prerequisite for retention policy and restore selection
- [ ] Retention policy: auto-delete backups older than configurable N days (default 14) — prevents unbounded storage growth
- [ ] Backup success/failure log entry per run — operators must know if backup ran
- [ ] Manual backup trigger via admin-authenticated POST endpoint — needed before risky bulk operations
- [ ] Database restore via admin-authenticated POST endpoint with confirmation gate — without this, the backup is unproven

### Add After Validation (v1.x)

Features to add once the core backup/restore path is confirmed working in production.

- [ ] Admin dashboard backup panel (list backups, trigger, see status) — useful for operational visibility; not required for data protection itself
- [ ] Persistent backup history log in MongoDB collection — adds auditability; depends on confirmed backup writing successfully

### Future Consideration (v2+)

- [ ] Automated restore verification to staging MongoDB — requires a second database instance
- [ ] Second Spaces region for 3-2-1 redundancy — meaningful only once primary backup is reliably running for 30+ days
- [ ] Email/webhook alert on backup failure — useful operational monitoring; build after structured logging is in place

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Automated daily backup (mongodump + gzip + Spaces upload) | HIGH | LOW | P1 |
| Direct Spaces upload via stdout pipe (no local disk) | HIGH | LOW | P1 |
| Timestamped backup filenames | HIGH | LOW | P1 |
| Retention policy (auto-delete old backups) | HIGH | LOW | P1 |
| Backup success/failure logging | HIGH | LOW | P1 |
| Manual backup trigger endpoint | HIGH | LOW | P1 |
| Database restore endpoint with confirmation gate | HIGH | MEDIUM | P1 |
| Admin dashboard backup panel | MEDIUM | MEDIUM | P2 |
| Persistent backup history log (MongoDB collection) | MEDIUM | LOW | P2 |
| Email/webhook alert on backup failure | MEDIUM | LOW | P2 |
| Automated restore verification to staging | HIGH | HIGH | P3 |
| Second Spaces region (3-2-1 redundancy) | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Must have for v1.6 — directly achieves RTO < 2h goal and data protection guarantee
- P2: Should have once P1 is stable and confirmed working in production
- P3: Future milestone — meaningful only after operational baseline established

---

## Existing Integrations That Reduce Implementation Effort

These are already present in the codebase and lower the effort for backup features directly.

| Existing Capability | How It Helps the Backup Feature |
|--------------------|--------------------------------|
| `@aws-sdk/client-s3` (or equivalent) for DigitalOcean Spaces image uploads | Reuse same SDK, credentials, and bucket configuration for backup uploads — already integrated and tested |
| `node-cron` (exchange rate job in `backend/jobs/exchangeRateJob.js`) | Copy the scheduling pattern verbatim; no new scheduler dependency |
| JWT admin middleware (`backend/middleware/auth.js`) | Protect backup trigger and restore endpoints without new auth logic |
| Environment variable pattern (`backend/env.example`) | Add `BACKUP_RETENTION_DAYS` and `BACKUP_SPACES_PREFIX` following established pattern |
| `child_process` (Node.js built-in) | Run mongodump/mongorestore as subprocesses; spawn with stdout piping to S3 upload stream |

---

## Competitor Feature Analysis

For the backup domain, "competitors" are managed backup services and common DIY patterns used at similar scale.

| Feature | MongoDB Atlas Backup | DIY Cron + S3 Pattern | Our Approach (v1.6) |
|---------|----------------------|----------------------|---------------------|
| Backup scheduling | Atlas-managed, UI-configured | node-cron in app code | node-cron (already installed) |
| Storage destination | Atlas-managed cloud snapshots | AWS S3 or S3-compatible bucket | DigitalOcean Spaces (existing credentials) |
| Retention policy | Atlas UI (hourly/daily/weekly/monthly tiers) | S3 lifecycle rules or custom list+delete | Custom code listing Spaces objects by date prefix |
| Restore capability | Atlas one-click UI restore | Download + mongorestore CLI | Admin endpoint + mongorestore subprocess |
| Monitoring | Atlas Alerts + email | Custom logging | Structured log entry per run |
| PITR | Atlas paid feature (replica set only) | Not available self-managed | Out of scope |
| Cost | ~$57/month (Atlas M10+ required for backups) | ~$0.02/GB/month Spaces storage | Negligible for ~94-product jewelry catalog |

**Rationale for DIY approach over Atlas managed backup**: Atlas M0 (free tier) does not include continuous cloud backup. Upgrading to Atlas M10+ (~$57/month) solely for backup would cost more than the current entire infrastructure. The DIY node-cron + Spaces approach achieves equivalent RPO/RTO for near-zero additional cost, using tools already present in the codebase.

---

## Sources

- [DigitalOcean: How To Set Up Scheduled MongoDB Backups to DigitalOcean Spaces](https://www.digitalocean.com/community/tutorials/how-to-set-up-scheduled-logical-mongodb-backups-to-digitalocean-spaces)
- [DigitalOcean App Platform: Persistent Storage Limitations](https://docs.digitalocean.com/products/app-platform/how-to/store-data/)
- [MongoDB Docs: Back Up and Restore with MongoDB Tools](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/)
- [MongoDB Docs: mongodump reference](https://www.mongodb.com/docs/database-tools/mongodump/)
- [Percona: MongoDB Backup Best Practices](https://www.percona.com/blog/mongodb-backup-best-practices/)
- [Percona: Streaming MongoDB Backups Directly to S3](https://www.percona.com/blog/streaming-mongodb-backups-directly-to-s3/)
- [MongoDB Backup and Recovery: How to Not Lose Your Data — Medium, Feb 2026](https://medium.com/@manisuec/mongodb-backup-and-recovery-how-to-not-lose-your-data-d6ece4e1fcf6)
- [CircleCI: Schedule Database Backups for MongoDB in a Node.js Application](https://circleci.com/blog/schedule-mongo-db-cleanup/)
- [DEV: How to Backup MongoDB Every Night in NodeJS](https://dev.to/yasseryka/how-to-backup-mongodb-every-night-in-nodejs-257o)
- [GitHub: dumpstr — mongodump directly to S3 without local disk](https://github.com/timisbusy/dumpstr)

---

*Feature research for: MongoDB Backup & Recovery System (v1.6)*
*Researched: 2026-04-04*
