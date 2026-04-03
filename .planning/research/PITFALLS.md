# Pitfalls Research

**Domain:** MongoDB Backup & Recovery System — Node.js/Express on DigitalOcean App Platform
**Researched:** 2026-04-04
**Confidence:** HIGH (critical pitfalls verified with official docs and multiple independent sources)

---

## Critical Pitfalls

### Pitfall 1: mongodump Binary Not Available in Production Container

**What goes wrong:**
The backup job fires on schedule, spawns `child_process.spawn('mongodump', ...)`, and gets `ENOENT: spawn mongodump`. The binary is missing from the production container. Backups silently fail or the job crashes. No data loss yet — but you have zero backups, and the system falsely appears to be running.

**Why it happens:**
Since MongoDB 4.4, the MongoDB Database Tools (mongodump, mongorestore) ship **separately** from the MongoDB Server. They are not automatically included in any Node.js deployment. The DigitalOcean App Platform Node.js buildpack does not include them. The developer tests locally where MongoDB Tools happen to be installed globally, deploys to App Platform, and the binary is absent. This is a confirmed real-world issue: when GitHub Actions' `ubuntu-latest` image updated from 20.04 to 22.04, many pipelines using `spawn('mongodump')` broke for exactly this reason.

**How to avoid:**
Install `mongodb-database-tools` via an `Aptfile` in the project root (App Platform supports the heroku-buildpack-apt approach for system packages). Critical caveat: Aptfile packages install to `/layers/digitalocean_apt/apt/usr/bin/`, not the standard `/usr/bin/`. You must resolve the actual binary path at startup — either by executing `which mongodump` as part of a startup probe, adding the layers path to `PATH` in your App Platform environment variables, or testing the path after first deployment. The safest fallback is a Dockerfile-based deploy that uses `RUN apt-get install -y mongodb-database-tools` for a predictable, standard install path.

**Warning signs:**
- `spawn mongodump ENOENT` errors in App Platform logs
- Backup schedule fires but no files appear in Spaces bucket
- `mongodump --version` not printed in startup diagnostic logs

**Phase to address:**
Phase 1 (Environment Setup). Verify binary availability in a deployed container before writing any backup logic. Do not proceed to Phase 2 until `mongodump --version` succeeds in production.

---

### Pitfall 2: Ephemeral Filesystem Loses Backup File Before Upload Completes

**What goes wrong:**
The backup writes a dump to `/tmp/backup-2026-04-04.gz`, then the upload to Spaces starts. If the container is replaced mid-operation — due to a deploy, health check failure, or scaling event — the temp file is gone. The upload either never starts or is abandoned mid-stream. The next backup job runs the following day with no error, and there is still no backup in Spaces.

**Why it happens:**
DigitalOcean App Platform instances are explicitly ephemeral. The documentation states: "Instances are being continuously created and destroyed as the app is scaled, redeployed, etc, and any changes to the filesystem will be destroyed with the instance." The local filesystem is also limited to 4 GiB — if it fills (for example, from accumulated temp files or log output), the container is detected as unhealthy and replaced, potentially mid-backup. Developers are accustomed to persistent filesystems and don't anticipate this behavior.

**How to avoid:**
Use `mongodump --archive --gzip` piped directly to stdout, then stream that output to DigitalOcean Spaces using the AWS SDK v3's streaming upload (`Body: childProcess.stdout`). This eliminates the local filesystem entirely as a dependency — no temp file is written, no upload-from-disk step exists. If a temp file is unavoidable during development/testing, always clean it up in a `finally` block and treat its existence as ephemeral by design. Never assume a file written to disk survives past the current request or job execution.

**Warning signs:**
- Backup job logs "complete" but Spaces bucket is empty
- Spaces bucket shows zero-byte files
- Container replacement events in App Platform runtime logs occurring around scheduled backup time

**Phase to address:**
Phase 2 (Core Backup Implementation). Design the Spaces upload as a stream from the first implementation — not as write-then-upload. This is a foundational architectural decision.

---

### Pitfall 3: node-cron Fires Backup N Times When App Has N Instances

**What goes wrong:**
If App Platform runs 2 instances (during a rolling deploy, brief scale-up, or manual scaling), node-cron fires inside every process simultaneously. Two mongodump operations hit Atlas at the same time. Two upload tasks race to write the same filename to Spaces, with one potentially overwriting the other mid-upload. Two retention cleanup jobs run in parallel and may delete files the other job just created. The net result: corrupted or incomplete backups, with each job believing it succeeded.

**Why it happens:**
node-cron (and any in-process scheduler) runs independently inside each Node.js process. There is no built-in coordination between processes. This is a documented known issue — the node-cron GitHub issue tracker has explicit reports of duplicate execution in PM2 cluster mode and multi-instance deployments. The project already uses node-cron for exchange rate scheduling, so the pattern is familiar, but backup is more destructive when duplicated: duplicate exchange rate fetches are harmless, duplicate backup runs are not.

**How to avoid:**
For the current single-instance App Platform deploy this risk is LOW day-to-day, but it activates during every rolling deploy (brief overlap of old and new instance). Three prevention strategies in order of preference: (1) Use App Platform's native **Scheduled Jobs** component (a separate job service, runs exactly once per schedule, no application code needed for scheduling). (2) Implement a MongoDB-backed distributed lock: attempt to write `{_id: 'backup-lock', lockedAt: new Date(), ttl: 10 minutes}` as an upsert with a TTL index — the second instance sees the existing document and skips. (3) At minimum, use timestamp-based filenames so duplicate runs produce distinct files rather than overwriting each other.

**Warning signs:**
- Two nearly-identical backup files in Spaces within seconds of each other
- Atlas connection count spikes at the scheduled backup time
- Retention job deletes a file that was just successfully uploaded

**Phase to address:**
Phase 1 (Scheduler Design). Decide on App Platform Jobs vs. in-process cron with locking before writing the scheduler. This affects the architecture of the entire backup system.

---

### Pitfall 4: Atlas IP Allowlist Blocks mongodump Connection at Runtime

**What goes wrong:**
The backup job connects to Atlas using the same `MONGODB_URI` the app uses. The job gets a "server selection timeout" error. The app itself connects to MongoDB fine because Mongoose established its connection pool at startup from the original container IP — but mongodump initiates a new connection at job runtime, potentially from a different IP after a deploy or scale event. Backups silently fail.

**Why it happens:**
MongoDB Atlas enforces IP-based network access. App Platform instances do not have fixed outbound IPs — IPs can change across deploys and scaling events. The developer may have configured Atlas to allow a specific IP (their dev machine, or the original deployment IP) rather than the broader range. The Mongoose connection works because it was established earlier from an allowed IP; mongodump connecting later from a new IP fails. The error message "server selection timeout" is generic and does not clearly indicate an IP allowlist rejection.

**How to avoid:**
If the existing Mongoose connection to Atlas works from the App Platform container, mongodump using the same `MONGODB_URI` from the same container also works — both originate from the same outbound IP. The risk is specifically when the allowlist was manually restricted or when the container IP changes between the Mongoose startup and the first backup job run. Verify Atlas Network Access settings: for App Platform, either allow `0.0.0.0/0` (accept the security tradeoff, protect with strong credentials) or configure VPC peering between DigitalOcean and Atlas for IP-stable access. Do not hard-code a specific IP as a "fix" — App Platform IPs change on every deploy.

**Warning signs:**
- `server selection timeout` in backup logs while the app itself serves MongoDB-backed requests successfully
- Backup failures correlated with recent deployments (IP change)
- Atlas Network Access logs show rejected connections from unfamiliar IPs

**Phase to address:**
Phase 1 (Environment Verification). Perform a test backup from the deployed container before building the full scheduler. Do not assume the connection works because the app runs.

---

### Pitfall 5: MongoDB Credentials Exposed in Process List and Logs

**What goes wrong:**
The backup job spawns: `mongodump --uri="mongodb+srv://user:PASSWORD@cluster.mongodb.net/dbname"`. On many systems, running `ps aux` shows the full command line including the password in plaintext. Additionally, if the code logs the spawn command for debugging (`console.log('Running:', cmd, args.join(' '))`), the full credentials appear in App Platform logs — which may be accessible to all team members. This is a documented, long-standing issue in MongoDB's own bug tracker (TOOLS-1020, TOOLS-1782).

**Why it happens:**
`--uri` passes the connection string as a CLI argument. CLI arguments are visible in `/proc/<pid>/cmdline` on Linux and in `ps` output. Developers use `--uri` because it is the simplest approach and directly mirrors how the Mongoose connection string is used. The logging pattern comes from natural debugging instinct.

**How to avoid:**
The connection string is already available as `process.env.MONGODB_URI`. Pass it to the spawned child process via the `env` option rather than as a CLI argument. Use mongodump's `--uri` but source it from environment rather than hardcoding it in the argument array. Critically: never log `args.join(' ')` when args contains the URI. If you must log the backup command, redact the credentials: `uri.replace(/:\/\/([^@]+)@/, '://***@')`. In the App Platform environment, use the existing `MONGODB_URI` environment variable — it is already set for the app and will be inherited by child processes.

**Warning signs:**
- Full Atlas connection string visible in App Platform deployment logs
- `console.log('Spawning:', cmd, ...args)` debug line left in production code
- Grep of logs finds the Atlas cluster hostname followed by credentials

**Phase to address:**
Phase 2 (Core Implementation). Security review before merging any backup job code. Check that no log line contains the Atlas cluster hostname followed by a password.

---

### Pitfall 6: mongorestore with --drop Targets Wrong Database or Destroys More Than Expected

**What goes wrong:**
Admin triggers a restore from a backup to fix corrupted data. The mongorestore command uses `--drop` (necessary to replace existing documents cleanly). If the target URI, `--db` parameter, or namespace mapping is misconfigured, mongorestore drops and replaces the wrong database — or drops collections not present in the backup, leaving permanent gaps in production data. There are also documented cases where `--drop` unexpectedly dropped admin users and roles (fixed in 2.6.4, but the broader category of "more was dropped than expected" remains a real risk).

**Why it happens:**
Without `--drop`, mongorestore inserts only: documents with existing `_id` values are skipped rather than replaced, leaving a mixed state that is often worse than the original problem. So `--drop` is necessary for a clean restore. But `--drop` drops each collection before restoring it. Under incident pressure — data corruption, production down, adrenaline — operators rush and misconfigure the target. A restore endpoint that accepts a user-supplied filename and immediately runs mongorestore is also a security and correctness hazard.

**How to avoid:**
Restore must never be a single-click operation. Require explicit confirmation: echo back the backup date, filename, and target database name, and require the operator to type a confirmation string (similar to GitHub's repository deletion confirmation pattern). Use `--nsFrom` and `--nsTo` with explicit namespace patterns rather than implicit database targeting. Always restore to a shadow or staging database first; verify document counts and spot-check data, then rename/swap if correct. Never build an HTTP endpoint that accepts an arbitrary filename and immediately calls mongorestore — this combines production data destruction risk with path traversal vulnerability.

**Warning signs:**
- Restore endpoint accepts a user-supplied filename parameter without sanitization
- No dry-run or confirmation step before mongorestore executes
- Restore triggered under incident pressure without a documented procedure

**Phase to address:**
Phase 3 or 4 (Restore Implementation). Treat restore as a privileged, confirmation-required, manually-executed operation with a written runbook. Do not build a "restore with one click" feature.

---

### Pitfall 7: Retention Cleanup Silently Fails to Delete Old Backups (S3 Pagination Limit)

**What goes wrong:**
The retention job lists objects in the Spaces bucket to find files older than N days and deletes them. It works correctly for months. After a year of daily backups, there are 365+ objects in the bucket. The AWS SDK's `listObjectsV2` returns a maximum of 1000 objects per call and sets `IsTruncated: true` for larger sets. If the code does not paginate, it processes only the first page. The oldest backups (the ones most overdue for deletion) are never removed. Storage costs grow unbounded, and the discovery happens via an unexpectedly large bill.

**Why it happens:**
Most retention examples online use a single `listObjectsV2` call without pagination because they assume small buckets. The AWS S3 API (and DigitalOcean Spaces, which is S3-compatible) silently truncates the response — it does not error, it just returns a partial list with a flag indicating more data exists. The code appears correct and works for the first year before the bucket size exceeds the page limit.

**How to avoid:**
Implement retention using the `@aws-sdk/client-s3` paginator helper `paginateListObjectsV2`, which automatically handles `NextContinuationToken` iteration. For this project's 7-14 day retention window, the bucket will never hold more than ~20 objects in steady state, making this a low near-term risk — but the implementation should be correct regardless. The pagination pattern costs nothing extra and prevents a class of bugs entirely.

**Warning signs:**
- Spaces bucket object count keeps growing past `retention_days + 5` objects
- Retention log reports "deleted 0 files" despite files older than the retention window existing
- Code uses a single `listObjectsV2` call without checking `NextContinuationToken` or `IsTruncated`

**Phase to address:**
Phase 4 or 5 (Retention Implementation). Use the paginator from the start — the AWS SDK v3 already used by the project for image uploads supports this directly.

---

### Pitfall 8: Silent Backup Failure — No Alerting, Failure Discovered Only When Restore Is Needed

**What goes wrong:**
The backup cron fires daily. It fails on day 3 due to a transient Atlas connection issue. The error is caught by a `try/catch`, logged to `console.error`, and the process continues normally. No notification is sent. App Platform runtime logs rotate. Three weeks later, a product catalog corruption event occurs. The team discovers that the last good backup is 23 days old, not 1 day old.

**Why it happens:**
The project's codebase explicitly has this pattern: "Incomplete error handling in catch blocks (silent failures)" is listed as known tech debt. Adding a backup job to this codebase without explicit failure alerting reproduces the established pattern. Backup success suffers from survivorship bias — you only notice failure when you need the backup, which is the worst possible time to discover it.

**How to avoid:**
Treat backup failure as a production incident. At minimum, implement three layers: (1) Write a structured log entry to MongoDB (or a dedicated Spaces file) for each backup attempt — filename, compressed size, duration, status, error if any. (2) Expose a "last successful backup" timestamp on an admin health endpoint that the admin dashboard can poll. (3) Send an email or webhook notification on failure — EmailJS is already integrated in the project and can send failure alerts without additional infrastructure. Backup status should be visible in the admin dashboard without requiring anyone to open App Platform logs.

**Warning signs:**
- No backup status row anywhere in the admin dashboard
- Backup failures only appear in App Platform logs (which rotate and are not monitored)
- No notification mechanism fires when the backup job throws an error
- "Last backup" date is not tracked anywhere in the system

**Phase to address:**
Phase 3 (Logging and Alerting). Alerting must ship with the backup system as a first-class feature, not as a follow-on task. A backup system without failure notification is not a backup system.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Write backup to `/tmp`, then upload | Simpler code, easier to debug | File lost if container restarts between write and upload | Never on App Platform — stream directly to Spaces instead |
| Pass `--uri` with password in CLI args | One-line mongodump invocation | Credentials visible in `ps`, CI logs, App Platform logs | Never — read from env var, don't pass as CLI arg |
| `listObjectsV2` without pagination | Less code, works for small buckets | Retention silently breaks when bucket grows past 1000 objects | Never — paginator is trivial to add |
| `console.error` as the only failure signal | Fast to implement | Silent failures go undetected until a restore is needed | Never for a production backup system |
| Restore endpoint with no confirmation gate | Simpler admin UI | One misclick drops production data | Never |
| In-process node-cron without locking | No new infrastructure | Duplicate runs on scale; backup competes with request serving | Acceptable only if App Platform instance count is confirmed and locked at 1 |
| Skip integrity verification after backup | Faster to ship | Backup is corrupt; discovered only during a restore incident | Never — verify at minimum with a file size check and metadata log |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| mongodump + Atlas SRV string | SRV DNS resolution fails on some container OS versions | Add `--numParallelCollections=1 --timeoutMS=60000 --readPreference=secondaryPreferred`; test from the deployed container, not just locally |
| DigitalOcean Spaces + AWS SDK v3 | Use default S3 region (`us-east-1`) and get endpoint errors | Set `endpoint: 'https://fra1.digitaloceanspaces.com'` and `region: 'fra1'` explicitly; project already does this for image uploads — reuse the same config |
| node-cron + App Platform scaling | Works on single instance; fires N times with N instances | Use App Platform Scheduled Jobs component, or implement MongoDB-backed distributed lock |
| mongorestore + authSource | Restore to non-Atlas MongoDB (local/staging) fails auth | Always pass `?authSource=admin` in the restore URI when targeting a non-Atlas instance |
| Aptfile + mongodump PATH | Binary installs successfully but `spawn('mongodump')` fails at runtime | Manually add the Aptfile layers path to PATH in App Platform environment config, or resolve the full binary path at startup with `execSync('which mongodump')` |
| Spaces backup bucket vs. image bucket | Retention cleanup runs against wrong bucket, deletes product images | Use a dedicated bucket (`tamar-jewelry-backups`) or an isolated prefix with prefix-scoped listing — never mix backup files with image files |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| mongodump reading from Atlas primary | Backup adds read load to the same node handling writes; request latency increases during backup window | Pass `--readPreference=secondaryPreferred` to redirect dump reads to a replica node | Any time backup runs during business hours; schedule at 02:00–04:00 UTC |
| Manual backup endpoint as synchronous HTTP response | Endpoint holds the connection open for the full dump duration; DO/Nginx proxy times out (typically 30–60s) | Make manual backup async: return a job ID immediately, poll for status | When database exceeds ~50 MB (current 94-product catalog is small — low near-term risk, but build async from the start) |
| Blocking event loop with `execSync` for mongodump | All HTTP requests stall while backup runs; site appears down during backup | Use `child_process.spawn` (async, non-blocking); never `execSync` for long operations | Immediately — the first backup run will block the e-commerce site |
| Backup and exchange rate jobs scheduled at same time | Both jobs fire simultaneously; Atlas connection pool saturated | Stagger schedules — backup at 02:00, exchange rate update at 03:00 | Low risk at current scale; avoidable by design with zero cost |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Backup filename from user input in restore endpoint | Path traversal — attacker crafts a filename to trigger restore of a weaponized backup or overwrite production data | Validate filename against a strict pattern (`/^backup-\d{4}-\d{2}-\d{2}T[\d-]+\.gz$/`); enumerate valid files from Spaces and only accept known filenames |
| Backup Spaces bucket publicly readable | Anyone can download a full database dump containing customer data and order history | Set bucket ACL to private; generate pre-signed URLs for admin download only, never expose public URLs |
| Restore endpoint without admin JWT guard | Any unauthenticated request can trigger a database wipe | Protect restore endpoint with the existing `requireAdmin` middleware — treat it as the highest-privilege endpoint in the system |
| Spaces credentials stored in code | Credentials committed to repository; Spaces accessible to anyone with repo access | Use App Platform environment variables; reuse the existing `SPACES_KEY` / `SPACES_SECRET` already configured for image uploads |
| Full MongoDB URI appearing in any log output | Atlas hostname + credentials visible in App Platform logs accessible to all team members | Redact before logging: `uri.replace(/:\/\/([^@]+)@/, '://***@')`; grep logs after each backup run to confirm no credentials are visible |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No backup status in admin dashboard | Admin has no visibility into whether backups are working without navigating to App Platform logs | Add a "Last backup" status row to admin settings or a dedicated backup management page showing date, size, duration, and status |
| Manual restore is undiscoverable | Admin cannot find the restore capability during an incident — high stress, limited time | Place restore UI prominently in the admin dashboard with clear warning language; document the restore procedure in a comment near the code and in a runbook |
| Backup list displays raw Spaces object keys | Filenames like `backup-2026-04-04T02-00-00.gz` are hard to parse under incident pressure | Format as human-readable: "April 4, 2026 — 2:00 AM — 4.2 MB — Success" with a download link |
| One-click restore with no confirmation | Admin accidentally triggers restore, drops production data | Require typing the backup date or a confirmation phrase (e.g., "restore 2026-04-03") before the restore executes |

---

## "Looks Done But Isn't" Checklist

- [ ] **Binary availability:** `mongodump --version` runs successfully in the deployed container — not just locally. Verify in a startup diagnostic log before enabling the scheduler.
- [ ] **Stream upload:** Backup uploads directly to Spaces as a stream with no temp file written to disk. Verify no file exists in `/tmp` after a successful backup run.
- [ ] **Atlas connectivity:** mongodump can establish a new connection from the deployed container at job runtime — not just at app startup. Run a test backup from the deployed container and confirm the file appears in Spaces.
- [ ] **Retention pagination:** Retention cleanup uses paginated listing. Verify by testing with a mock that returns `IsTruncated: true` and confirms the second page is fetched.
- [ ] **Failure alerting:** A backup failure sends a visible alert within 24 hours. Verify by intentionally breaking the Atlas URI and confirming an email or dashboard alert fires.
- [ ] **Restore confirmation gate:** The restore endpoint requires explicit confirmation and is protected by admin JWT. Verify an unauthenticated request returns 401, and an authenticated request without the confirmation token returns an error.
- [ ] **Backup integrity:** At least one full restore-to-staging-database test completes successfully, with document counts verified against the source. Do not ship restore capability that has never been tested end-to-end.
- [ ] **Credentials not in logs:** Full MongoDB URI never appears in any App Platform log entry. After a backup run, grep the logs for the Atlas cluster hostname and confirm no password follows it.
- [ ] **Duplicate run protection:** Only one backup runs per schedule window. Verify by checking App Platform instance count and testing behavior during a rolling deploy.
- [ ] **Correct bucket/prefix isolation:** Backup files land in a dedicated bucket or prefix, confirmed by checking that no image files share the same listing scope as the retention cleanup.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Binary missing in production | LOW | Add `Aptfile` with `mongodb-database-tools`, configure PATH in App Platform env vars, redeploy. No data loss. |
| Backup failures undetected for weeks | HIGH | Assess how many days of backups are missing. Restore from the oldest available backup. Accept the data gap. Implement alerting before re-enabling the scheduler. |
| Temp file fills ephemeral disk, container killed | LOW | App recovers automatically via container replacement. Fix the code to use stream upload before the next backup window. |
| Duplicate backup runs race-condition corrupted a Spaces file | MEDIUM | List bucket objects, identify the corrupted/incomplete file (size anomaly), delete it, trigger a manual backup to replace it. |
| Retention pagination bug — bucket unbounded growth | LOW | Fix the pagination code, manually delete stale files from the Spaces console or via a one-off script. No data loss; only a storage cost issue. |
| mongorestore targets wrong database with --drop | CRITICAL | Requires a prior valid backup to restore from. If no valid backup exists, data loss is permanent — this is the justification for the entire backup system. Run restore targeting the correct database name with explicit namespace mapping. |
| Atlas credentials visible in logs | MEDIUM | Immediately rotate the Atlas database user password and the Spaces access keys. Audit who has had access to the App Platform logs. Redeploy with credential redaction in place. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| mongodump binary missing | Phase 1: Environment Setup | `mongodump --version` logged successfully from deployed container |
| Ephemeral filesystem dependency | Phase 2: Core Backup | No `/tmp` writes; confirm stream-to-Spaces end-to-end in deployed environment |
| node-cron duplicate on scaling | Phase 1: Scheduler Design | Document instance count constraint; implement locking or use App Platform Jobs |
| Atlas IP allowlist blocking backup | Phase 1: Environment Verification | Successful test backup run from deployed container using production URI |
| Credentials in process list / logs | Phase 2: Core Implementation | Code review; grep App Platform logs for Atlas cluster hostname after a run |
| mongorestore on wrong database | Phase 3: Restore Implementation | Confirmation gate in restore endpoint; namespace explicit via `--nsFrom`/`--nsTo` |
| Retention pagination bug | Phase 4: Retention | Test with mock paginator returning `IsTruncated: true`; verify second page is processed |
| Silent failure / no alerting | Phase 3: Logging | Intentionally break Atlas URI; confirm alert fires within 24 hours |
| Backup bucket publicly readable | Phase 2: Spaces Integration | Attempt unauthenticated download of a backup file; confirm 403 |
| No restore status in admin UI | Phase 5: Admin Dashboard | Verify backup status row visible; verify restore requires confirmation before executing |

---

## Sources

- [DigitalOcean App Platform — How to Store Data](https://docs.digitalocean.com/products/app-platform/how-to/store-data/) — confirms ephemeral filesystem, 4 GiB limit, Spaces as the persistent alternative (HIGH confidence)
- [DigitalOcean App Platform — Aptfile Buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/aptfile/) — Aptfile package installation, PATH caveat for non-standard install locations (HIGH confidence)
- [DigitalOcean — Scheduled MongoDB Backups to Spaces](https://www.digitalocean.com/community/tutorials/how-to-set-up-scheduled-logical-mongodb-backups-to-digitalocean-spaces) — reference architecture for this integration (HIGH confidence)
- [Fixing mongodump on Atlas Free Cluster (2025)](https://www.ganesshkumar.com/articles/2025-10-11-fixing-mongodump-on-atlas-free-cluster/) — server selection timeout, authSource, recommended flags (MEDIUM confidence)
- [MongoDB Database Tools Installation Guide](https://www.mongodb.com/docs/database-tools/mongodump/mongodump-compatibility-and-installation/) — tools ship separately from MongoDB Server since 4.4 (HIGH confidence)
- [MongoDB JIRA TOOLS-1020](https://jira.mongodb.org/browse/TOOLS-1020) — credentials visible in process list; [TOOLS-1782](https://jira.mongodb.org/browse/TOOLS-1782) — mitigation via config file (HIGH confidence)
- [node-cron GitHub issue #393 — duplicate cron jobs in cluster mode](https://github.com/node-cron/node-cron/issues/393) — multiple instances fire the same job (HIGH confidence)
- [GitHub — spawn mongodump ENOENT in actions/setup-node](https://github.com/actions/setup-node/issues/632) — real-world binary missing after OS version change (HIGH confidence)
- [Percona — Streaming MongoDB Backups Directly to S3](https://www.percona.com/blog/streaming-mongodb-backups-directly-to-s3/) — stream-to-S3 without temp file pattern (MEDIUM confidence)
- [MongoDB mongorestore docs — behavior and --drop](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-behavior-access-usage/) — inserts only by default; --drop drops before restore (HIGH confidence)
- [MongoDB community forum — accidentally overwrote collection](https://www.mongodb.com/community/forums/t/accidentally-overwrote-collection/275471) — real production incident report (MEDIUM confidence)
- [Cloudron forum — retention policy not deleting old backups](https://forum.cloudron.io/topic/9789/backups-before-retention-policy-not-being-deleted-bug) — first 1000 objects pagination limit (MEDIUM confidence)
- [QuotaGuard blog — 0.0.0.0/0 dynamic IP trap for Atlas](https://www.quotaguard.com/blog/serverless-static-ip-mongodb-atlas-whitelist) — IP allowlist issue with dynamic cloud IPs (MEDIUM confidence)
- [Medium — Silent Corruption: Backup Integrity Validation](https://medium.com/@sabithvm/the-silent-corruption-why-backup-integrity-validation-cant-wait-until-you-need-to-restore-dca5e8b65137) — untested backups are not backups (MEDIUM confidence)

---
*Pitfalls research for: MongoDB Backup & Recovery System on DigitalOcean App Platform*
*Researched: 2026-04-04*
