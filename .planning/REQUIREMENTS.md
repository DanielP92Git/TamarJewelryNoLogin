# Requirements: MongoDB Backup & Recovery System

**Defined:** 2026-04-04
**Core Value:** Prevent permanent data loss with automated off-region backups and quick recovery (RTO < 2 hours)

## v1.6 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Backup Core

- [x] **BKUP-01**: System runs automated daily MongoDB backup using mongodump with gzip compression
- [x] **BKUP-02**: Backup archives are uploaded directly to DigitalOcean Spaces (off-region bucket)
- [x] **BKUP-03**: Backup files use timestamped naming convention (ISO format, sortable)
- [x] **BKUP-04**: mongodump/mongorestore binaries are available in the App Platform runtime (via Aptfile)

### Monitoring & Logging

- [x] **MON-01**: Each backup run produces a structured log entry (timestamp, status, size, duration, error)
- [ ] **MON-02**: Failed backups trigger an email alert via EmailJS
- [ ] **MON-03**: Backup run history is persisted in a MongoDB `backup_logs` collection

### Admin Operations

- [ ] **ADM-01**: Admin can trigger a manual backup via authenticated POST endpoint
- [ ] **ADM-02**: Admin dashboard displays backup panel (list backups, trigger, view status)
- [x] **ADM-03**: Retention count is configurable via `BACKUP_RETENTION_COUNT` env var (default 14)

### Restore & Recovery

- [ ] **REST-01**: Admin can restore database from a specific backup via authenticated POST endpoint
- [ ] **REST-02**: Restore requires explicit confirmation to prevent accidental data overwrite
- [ ] **REST-03**: Admin can view list of available backups (GET endpoint)

### Retention

- [x] **RET-01**: System auto-deletes backups exceeding the retention count after each successful backup

## Future Requirements

### Operational Enhancements

- **OPS-01**: Automated restore verification against staging MongoDB instance
- **OPS-02**: Second Spaces region for 3-2-1 backup redundancy
- **OPS-03**: Webhook/Slack alert integration for backup status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Point-in-time recovery (PITR) | Requires replica set oplog; over-engineered for ~94-product catalog |
| Incremental backups | mongodump doesn't support without oplog; full dump is <10MB compressed |
| Backup encryption | Spaces provides server-side AES-256 at rest; double encryption adds complexity |
| Auto-restore on failure | Destructive — cascades partial failure into total data loss |
| Multi-cloud backup (AWS S3 + Spaces) | Over-engineered for current scale; off-region Spaces bucket suffices |
| Automated restore verification | Requires second MongoDB instance; quarterly manual test sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BKUP-01 | Phase 34 | Complete |
| BKUP-02 | Phase 34 | Complete |
| BKUP-03 | Phase 34 | Complete |
| BKUP-04 | Phase 33 | Complete |
| MON-01 | Phase 34 | Complete |
| MON-02 | Phase 35 | Pending |
| MON-03 | Phase 35 | Pending |
| ADM-01 | Phase 35 | Pending |
| ADM-02 | Phase 37 | Pending |
| ADM-03 | Phase 34 | Complete |
| REST-01 | Phase 36 | Pending |
| REST-02 | Phase 36 | Pending |
| REST-03 | Phase 35 | Pending |
| RET-01 | Phase 34 | Complete |

**Coverage:**
- v1.6 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after roadmap creation (traceability filled)*
