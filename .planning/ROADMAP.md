# Roadmap: Tamar Kfir Jewelry

## Milestones

- ✅ **v1.0 SKU Management** — Phases 1-3 (shipped 2026-02-01) — [archive](.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Admin Product Management UX** — Phases 4-9 (shipped 2026-02-04) — [archive](.planning/milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Test Infrastructure & Critical Coverage** — Phases 10-16 (shipped 2026-02-06) — [archive](.planning/milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Frontend Testing** — Phases 17-22 (shipped 2026-02-09) — [archive](.planning/milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 SEO & Marketing Foundation** — Phases 23-26 (shipped 2026-02-12) — [archive](.planning/milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Bilingual Product Content** — Phases 27-32 (shipped 2026-02-17) — [archive](.planning/milestones/v1.5-ROADMAP.md)
- 🚧 **v1.6 MongoDB Backup & Recovery System** — Phases 33-37 (in progress)

## Phases

<details>
<summary>✅ v1.0 SKU Management (Phases 1-3) - SHIPPED 2026-02-01</summary>

- [x] Phase 1: Database & Schema (3/3 plans) — completed 2026-02-01
- [x] Phase 2: Admin Dashboard Integration (1/1 plan) — completed 2026-02-01
- [x] Phase 3: Frontend Display (1/1 plan) — completed 2026-02-01

See [v1.0-ROADMAP.md](.planning/milestones/v1.0-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.1 Admin Product Management UX (Phases 4-9) - SHIPPED 2026-02-04</summary>

- [x] Phase 4: Product Preview Modal (5/5 plans) — completed 2026-02-02
- [x] Phase 5: Database Schema Migration (5/5 plans) — completed 2026-02-02
- [x] Phase 6: Product List Reordering (7/7 plans) — completed 2026-02-03
- [x] Phase 7: Image Gallery Unification (6/6 plans) — completed 2026-02-03
- [x] Phase 8: Cross-Device Testing (5/5 plans) — completed 2026-02-04
- [x] Phase 9: Documentation & Cleanup (5/5 plans) — completed 2026-02-04

See [v1.1-ROADMAP.md](.planning/milestones/v1.1-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.2 Test Infrastructure & Critical Coverage (Phases 10-16) - SHIPPED 2026-02-06</summary>

- [x] Phase 10: Test Infrastructure (3/3 plans) — completed 2026-02-05
- [x] Phase 11: Authentication & Authorization Tests (4/4 plans) — completed 2026-02-05
- [x] Phase 12: Payment Processing Tests (3/3 plans) — completed 2026-02-05
- [x] Phase 13: Currency & Exchange Rate Tests (3/3 plans) — completed 2026-02-06
- [x] Phase 14: File Upload & Image Processing Tests (4/4 plans) — completed 2026-02-06
- [x] Phase 15: Database & Model Tests (4/4 plans) — completed 2026-02-06
- [x] Phase 16: Security & Middleware Tests (4/4 plans) — completed 2026-02-06

See [v1.2-ROADMAP.md](.planning/milestones/v1.2-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.3 Frontend Testing (Phases 17-22) — SHIPPED 2026-02-09</summary>

- [x] Phase 17: Test Infrastructure & Utilities (3/3 plans) — completed 2026-02-08
- [x] Phase 18: Model Unit Tests (4/4 plans) — completed 2026-02-08
- [x] Phase 19: Base View Tests (4/4 plans) — completed 2026-02-09
- [x] Phase 20: Page View Tests (3/3 plans) — completed 2026-02-09
- [x] Phase 21: Locale & Currency Tests (2/2 plans) — completed 2026-02-09
- [x] Phase 22: MVC Integration Tests (4/4 plans) — completed 2026-02-09

See [v1.3-ROADMAP.md](.planning/milestones/v1.3-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.4 SEO & Marketing Foundation (Phases 23-26) — SHIPPED 2026-02-12</summary>

- [x] Phase 23: Foundation & Infrastructure (5/5 plans) — completed 2026-02-10
- [x] Phase 24: Static Page SSR + Meta Tags + Deployment Merge (5/5 plans) — completed 2026-02-11
- [x] Phase 25: Dynamic SSR + Structured Data + Sitemap (4/4 plans) — completed 2026-02-11
- [x] Phase 26: Caching, Performance & Verification (4/4 plans) — completed 2026-02-12

See [v1.4-ROADMAP.md](.planning/milestones/v1.4-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.5 Bilingual Product Content (Phases 27-32) — SHIPPED 2026-02-17</summary>

- [x] Phase 27: Schema Migration & Foundation (2/2 plans) — completed 2026-02-14
- [x] Phase 28: Translation Service Integration (2/2 plans) — completed 2026-02-15
- [x] Phase 29: Admin UI & Translation Workflow (2/2 plans) — completed 2026-02-15
- [x] Phase 30: Frontend Display & SSR Updates (2/2 plans) — completed 2026-02-15
- [x] Phase 31: Cache Invalidation & SEO Polish (2/2 plans) — completed 2026-02-16
- [x] Phase 32: Bulk Translation & Migration Tooling (2/2 plans) — completed 2026-02-16

See [v1.5-ROADMAP.md](.planning/milestones/v1.5-ROADMAP.md) for full phase details.

</details>

### v1.6 MongoDB Backup & Recovery System (In Progress)

**Milestone Goal:** Prevent permanent data loss with automated off-region backups and quick recovery capability (RTO < 2 hours).

- [x] **Phase 33: Environment Setup & Binary Verification** — Confirm mongodump/mongorestore available in App Platform runtime (completed 2026-04-04)
- [ ] **Phase 34: Core Backup Service** — Automated daily backups landing in off-region Spaces with retention
- [ ] **Phase 35: Manual Trigger, Backup Listing & Failure Alerting** — Admin can trigger backups, view history, and receive failure notifications
- [ ] **Phase 36: Database Restore** — Admin can restore database from a specific backup with confirmation gate
- [ ] **Phase 37: Admin Dashboard Panel** — Admin can manage backups without SSH access

## Phase Details

### Phase 33: Environment Setup & Binary Verification
**Goal**: mongodump and mongorestore binaries are confirmed available and PATH-resolved in the deployed App Platform container before any backup logic is written
**Depends on**: Phase 32
**Requirements**: BKUP-04
**Success Criteria** (what must be TRUE):
  1. `mongodump --version` output is logged from a running App Platform container (confirming binary is present)
  2. `backend/Aptfile` with `mongodb-database-tools` is committed and the App Platform build installs it
  3. New environment variables (`BACKUP_BUCKET`, `BACKUP_SPACES_PREFIX`, `BACKUP_RETENTION_COUNT`, `MONGODUMP_PATH`) are documented in `backend/env.example`
  4. Atlas IP allowlist is confirmed to allow connections from App Platform container IPs at job runtime
  5. Decision is documented: App Platform Scheduled Jobs vs. in-process node-cron with distributed lock
**Plans:** 2/1 plans complete
Plans:
- [x] 33-01-PLAN.md — Aptfile, env.example, startup binary check, admin backup-status endpoint
- [x] 33-02-PLAN.md — Unit tests for binary verification, integration tests for backup-status endpoint

### Phase 34: Core Backup Service
**Goal**: The system automatically creates a compressed, timestamped MongoDB backup every day and uploads it to an off-region Spaces bucket, cleaning up old archives by retention count
**Depends on**: Phase 33
**Requirements**: BKUP-01, BKUP-02, BKUP-03, MON-01, RET-01, ADM-03
**Success Criteria** (what must be TRUE):
  1. A daily backup runs at 03:00 AM without manual intervention and produces a `.archive.gz` file in Spaces
  2. Backup filenames follow ISO timestamped format (e.g., `backup-2026-04-04T03-00-00Z.archive.gz`) that sorts lexicographically by date
  3. After each successful backup, backups exceeding the retention count are deleted from Spaces automatically
  4. Retention count defaults to 14 and is overridable via `BACKUP_RETENTION_COUNT` environment variable
  5. Each backup run produces a structured log entry with timestamp, status, file size, duration, and any error message
**Plans**: TBD

### Phase 35: Manual Trigger, Backup Listing & Failure Alerting
**Goal**: Admin can trigger a backup on demand, view backup run history, and receive an email notification when a backup fails
**Depends on**: Phase 34
**Requirements**: ADM-01, REST-03, MON-02, MON-03
**Success Criteria** (what must be TRUE):
  1. Authenticated admin can POST to `/backup` and receive a synchronous response showing the result (file name, size, duration) of the triggered backup
  2. Authenticated admin can GET `/backups` and receive a list of all available Spaces backup objects with their dates and sizes
  3. Backup run history is persisted in a `backup_logs` MongoDB collection with at least timestamp, status, filename, bytes, duration_ms, and error fields
  4. When a backup fails, an email alert is sent via the existing EmailJS integration with error details
**Plans**: TBD
**UI hint**: yes

### Phase 36: Database Restore
**Goal**: Admin can restore the database from any available backup, with an explicit confirmation gate preventing accidental data overwrite
**Depends on**: Phase 35
**Requirements**: REST-01, REST-02
**Success Criteria** (what must be TRUE):
  1. Authenticated admin can POST to `/restore/:key` and trigger a full database restore from a named Spaces backup object
  2. Restore request is rejected unless the request body includes `{ "confirm": "RESTORE" }` — missing or wrong confirmation string returns an error, not a restore
  3. Backup key is validated against the actual list of Spaces objects before restore begins — user-supplied keys that don't match a known object are rejected
  4. End-to-end restore test is completed against the real Atlas cluster and confirmed working (documented in code comment or plan summary)
**Plans**: TBD

### Phase 37: Admin Dashboard Panel
**Goal**: Admin can view backup status, trigger backups, and initiate a restore from the admin dashboard without needing SSH access or App Platform log inspection
**Depends on**: Phase 36
**Requirements**: ADM-02
**Success Criteria** (what must be TRUE):
  1. Admin dashboard shows a backup panel listing available backups with human-readable date, time, and file size
  2. Backup panel shows a "last successful backup" status row visible at a glance without scrolling
  3. Admin can trigger a manual backup from the dashboard with a button and see the result inline
  4. Admin can initiate a restore from the dashboard with a confirmation phrase requirement before execution proceeds
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 33 → 34 → 35 → 36 → 37

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-3. SKU Management | v1.0 | Complete | Complete | 2026-02-01 |
| 4-9. Admin UX | v1.1 | Complete | Complete | 2026-02-04 |
| 10-16. Test Infrastructure | v1.2 | Complete | Complete | 2026-02-06 |
| 17-22. Frontend Testing | v1.3 | Complete | Complete | 2026-02-09 |
| 23-26. SEO & Marketing | v1.4 | Complete | Complete | 2026-02-12 |
| 27-32. Bilingual Content | v1.5 | Complete | Complete | 2026-02-17 |
| 33. Environment & Binary Verification | v1.6 | 2/1 | Complete   | 2026-04-04 |
| 34. Core Backup Service | v1.6 | 0/? | Not started | - |
| 35. Manual Trigger & Alerting | v1.6 | 0/? | Not started | - |
| 36. Database Restore | v1.6 | 0/? | Not started | - |
| 37. Admin Dashboard Panel | v1.6 | 0/? | Not started | - |

---
*Last updated: 2026-04-04 after Phase 33 planning*
