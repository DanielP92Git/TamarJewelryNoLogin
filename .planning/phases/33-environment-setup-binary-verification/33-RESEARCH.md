# Phase 33: Environment Setup & Binary Verification - Research

**Researched:** 2026-04-04
**Domain:** DigitalOcean App Platform system packages (Aptfile), Node.js binary verification, MongoDB Atlas IP allowlisting, env.example documentation
**Confidence:** MEDIUM — Aptfile binary PATH on App Platform is MEDIUM confidence (community-sourced, not fully official); all other areas HIGH.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use in-process node-cron for backup scheduling, consistent with the existing `exchangeRateJob.js` pattern. No separate worker process or App Platform Scheduled Job.
- **D-02:** No distributed lock needed — single App Platform instance means no concurrent backup risk.
- **D-03:** Create a dedicated Spaces bucket (e.g., `tamar-jewelry-backups`) separate from the image bucket (`tamar-jewelry-images`).
- **D-04:** Backup bucket region: Amsterdam (ams3) — off-region from primary Frankfurt (fra1) for geographic redundancy.
- **D-05:** Separate Spaces credentials for the backup bucket (BACKUP_SPACES_KEY, BACKUP_SPACES_SECRET, etc.) — distinct from image storage credentials.
- **D-06:** Startup verification: run `mongodump --version` on server start and log the result. Fail loud if binaries are missing.
- **D-07:** Admin endpoint: expose GET `/admin/backup-status` (behind auth) that returns binary availability, path, and version info.
- **D-08:** `MONGODUMP_PATH` defaults to `mongodump` (PATH lookup). Override available for non-standard install locations. Same pattern for `MONGORESTORE_PATH`.
- **D-09:** New env vars to document in `env.example`: `BACKUP_BUCKET`, `BACKUP_SPACES_PREFIX`, `BACKUP_RETENTION_COUNT`, `MONGODUMP_PATH`, `MONGORESTORE_PATH`, `BACKUP_SPACES_KEY`, `BACKUP_SPACES_SECRET`, `BACKUP_SPACES_ENDPOINT`, `BACKUP_SPACES_REGION`.

### Claude's Discretion

- Default values for `BACKUP_RETENTION_COUNT` (14 per requirements) and `BACKUP_SPACES_PREFIX` (e.g., `backups/`)
- Aptfile exact package name and format
- Startup check implementation details (child_process.execSync vs execFileSync, error handling)
- Admin endpoint response shape

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BKUP-04 | mongodump/mongorestore binaries are available in the App Platform runtime (via Aptfile) | Aptfile format documented; package name identified; PATH issue and `MONGODUMP_PATH` env var pattern described; startup check and admin endpoint patterns provided |
</phase_requirements>

---

## Summary

Phase 33 is an infrastructure-confirmation phase with zero production code risk: its purpose is to prove that `mongodump` and `mongorestore` exist and are PATH-accessible inside the running App Platform container before any backup logic is written. The three concrete deliverables are: (1) `backend/Aptfile` committed and deploying cleanly, (2) startup log output from `mongodump --version` visible in App Platform runtime logs, and (3) new env vars documented in `backend/env.example`.

The largest uncertainty in this phase is PATH resolution. DigitalOcean App Platform's Aptfile buildpack installs packages into `/layers/digitalocean_apt/apt/...` rather than the standard system `/usr/bin`. Community evidence (MEDIUM confidence) indicates that binaries land at `/layers/digitalocean_apt/apt/usr/bin/mongodump` and are NOT automatically on PATH. The `MONGODUMP_PATH` env var (D-08) is the correct mitigation: the startup check tries the env var first, falls back to bare `mongodump`, and logs whatever `which mongodump` returns in the container so the actual path is confirmed at first deploy.

The `mongodb-database-tools` package is NOT available in Ubuntu's default APT repositories. It requires MongoDB's official repository, but the Aptfile buildpack supports direct `.deb` URL downloads (no repo setup needed). The preferred approach is to use a direct `.deb` URL from MongoDB's download center, which bypasses the GPG-key and source-list ceremony that the `:repo:` Aptfile syntax would require.

**Primary recommendation:** Use a direct `.deb` URL in Aptfile pointing to a specific `mongodb-database-tools` release for Ubuntu 22.04 (jammy). Log both `which mongodump` and `mongodump --version` at startup. Set `MONGODUMP_PATH` to the known `/layers/...` path as fallback.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | 3.0.3 (already installed) | Scheduling the backup job | Already in dependencies; used by `exchangeRateJob.js` |
| aws-sdk | 2.1693.0 (already installed) | S3-compatible Spaces client | Already in dependencies; used for image uploads |
| child_process | Node.js built-in | Run mongodump/mongorestore subprocesses | No additional install needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mongodb-database-tools (system binary) | 100.x (latest at deploy) | Provides mongodump and mongorestore | Installed via Aptfile at build time |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct .deb URL in Aptfile | `:repo:` Aptfile syntax + GPG setup | Direct URL is simpler — no repo config, no GPG key ceremony; locked to specific version (predictable); requires updating URL to upgrade |
| Direct .deb URL | App Platform Scheduled Job with separate worker | D-01 locked node-cron; in-process keeps infrastructure simple |
| `execFileSync` for version check | `spawnSync` | Both work; execFileSync throws on non-zero exit (correct behavior for startup fail-loud); simpler for a one-liner version check |

**Installation (system level, not npm):**

The Aptfile installs at build time. No npm install needed. Aptfile is placed at `backend/Aptfile` with one line:

```
https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.deb
```

Exact URL must be verified against MongoDB's current release before committing. Check https://www.mongodb.com/try/download/database-tools for the latest Ubuntu 22.04 x86_64 `.deb` URL.

**Version verification:** Before writing the Aptfile, confirm the current release URL:
```bash
# Visit https://www.mongodb.com/try/download/database-tools
# Select: Version=latest, Platform=Ubuntu 22.04, Package=deb
# Copy the direct download URL
```

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Phase 33 adds/modifies three files:

```
backend/
├── Aptfile                    # NEW — system package install for App Platform build
├── env.example                # MODIFIED — add backup env var section
└── index.js                   # MODIFIED — add startup binary check + /admin/backup-status route
```

### Pattern 1: Aptfile Direct .deb URL

**What:** Aptfile at the repo root of the buildpack context (`backend/Aptfile` since the App Platform app root is `backend/`) containing a direct `.deb` download URL.

**When to use:** When the target package is not in Ubuntu's default APT repos (which `mongodb-database-tools` is not).

**Example:**
```
# backend/Aptfile
https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.deb
```

The Aptfile must be at the root of the source directory that App Platform builds. For this project, that is `backend/` (App Platform's source root for the Node.js component).

### Pattern 2: Startup Binary Check

**What:** At server startup, after `connectDb()` resolves and before `app.listen()`, run a synchronous child_process call to `mongodump --version` and log the result. Fail loud (throw or `process.exit(1)`) if the binary is not found.

**When to use:** Every server start in all environments. The check is cheap (< 100ms) and surfaces missing-binary problems immediately.

**Example:**
```javascript
// Source: Node.js built-in child_process (no package needed)
const { execFileSync } = require('child_process');

function verifyMongodumpBinary() {
  const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';
  const mongodumpPath2 = process.env.MONGORESTORE_PATH || 'mongorestore';

  try {
    // Log resolved path first — critical for confirming /layers path on App Platform
    try {
      const whichResult = execFileSync('which', [mongodumpPath], { encoding: 'utf8' }).trim();
      console.log(`[backup] mongodump resolved path: ${whichResult}`);
    } catch {
      // 'which' may not be available in all environments
      console.log(`[backup] mongodump PATH lookup: ${mongodumpPath}`);
    }

    const version = execFileSync(mongodumpPath, ['--version'], { encoding: 'utf8' }).trim();
    console.log(`[backup] mongodump binary OK: ${version}`);
  } catch (err) {
    console.error(`[backup] FATAL: mongodump binary not found at "${process.env.MONGODUMP_PATH || 'mongodump'}"`, err.message);
    // D-06: fail loud — do not swallow
    throw new Error('mongodump binary unavailable. Check Aptfile and MONGODUMP_PATH.');
  }
}
```

The call to `verifyMongodumpBinary()` should happen after `connectDb()` resolves, inside the `.then()` callback that already calls `initializeExchangeRate()`. It does NOT need to be inside `app.listen` (that would hide errors).

**Actual placement in index.js:**
```javascript
connectDb()
  .then(() => {
    verifyMongodumpBinary();   // <-- add here, after DB connects
    initializeExchangeRate();
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err?.message || err);
  });
```

### Pattern 3: Admin Backup-Status Endpoint

**What:** GET `/admin/backup-status` protected by `fetchUser, requireAdmin` middleware — returns binary version, resolved path, and configured env vars (without exposing secret values).

**When to use:** Follows the exact pattern of existing admin endpoints like `POST /admin/update-exchange-rate`.

**Example:**
```javascript
// Source: mirrors existing admin route pattern in index.js
app.get(
  '/admin/backup-status',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  (req, res) => {
    const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';
    let versionOutput = null;
    let binaryFound = false;
    let resolvedPath = null;
    let error = null;

    try {
      const { execFileSync } = require('child_process');
      versionOutput = execFileSync(mongodumpPath, ['--version'], { encoding: 'utf8' }).trim();
      binaryFound = true;

      try {
        resolvedPath = execFileSync('which', [mongodumpPath], { encoding: 'utf8' }).trim();
      } catch {
        resolvedPath = mongodumpPath;
      }
    } catch (err) {
      error = err.message;
    }

    res.json({
      binaryFound,
      mongodumpPath,
      mongodumpVersion: versionOutput,
      resolvedPath,
      error,
      envConfig: {
        BACKUP_BUCKET: process.env.BACKUP_BUCKET ? '[SET]' : '[NOT SET]',
        BACKUP_SPACES_KEY: process.env.BACKUP_SPACES_KEY ? '[SET]' : '[NOT SET]',
        BACKUP_SPACES_SECRET: process.env.BACKUP_SPACES_SECRET ? '[SET]' : '[NOT SET]',
        BACKUP_SPACES_ENDPOINT: process.env.BACKUP_SPACES_ENDPOINT || null,
        BACKUP_SPACES_REGION: process.env.BACKUP_SPACES_REGION || null,
        BACKUP_SPACES_PREFIX: process.env.BACKUP_SPACES_PREFIX || 'backups/',
        BACKUP_RETENTION_COUNT: process.env.BACKUP_RETENTION_COUNT || '14',
        MONGODUMP_PATH: process.env.MONGODUMP_PATH || '(default: mongodump)',
        MONGORESTORE_PATH: process.env.MONGORESTORE_PATH || '(default: mongorestore)',
      },
    });
  }
);
```

### Pattern 4: env.example Extension

**What:** New section appended to `backend/env.example` documenting all backup-related env vars (D-09).

**When to use:** Always add new env vars to env.example in the same PR that introduces them.

**Example addition:**
```bash
# ---------------------------------------------
# MongoDB Backup (REQUIRED for backup system)
# ---------------------------------------------
# Dedicated Spaces bucket for backups (separate from images bucket)
BACKUP_BUCKET=tamar-jewelry-backups

# Spaces region for backup bucket (off-region from primary fra1)
BACKUP_SPACES_REGION=ams3

# Spaces endpoint for backup bucket
# Example: https://ams3.digitaloceanspaces.com
BACKUP_SPACES_ENDPOINT=

# Separate Spaces credentials for backup bucket
BACKUP_SPACES_KEY=
BACKUP_SPACES_SECRET=

# Optional CDN base URL for backup bucket (usually not needed)
# BACKUP_SPACES_CDN_BASE_URL=

# Prefix path inside the backup bucket (trailing slash required)
BACKUP_SPACES_PREFIX=backups/

# Number of backups to keep (older ones deleted automatically)
BACKUP_RETENTION_COUNT=14

# Path to mongodump binary. Leave blank to use PATH lookup.
# On App Platform with Aptfile, may need:
# /layers/digitalocean_apt/apt/usr/bin/mongodump
MONGODUMP_PATH=

# Path to mongorestore binary. Leave blank to use PATH lookup.
# On App Platform with Aptfile, may need:
# /layers/digitalocean_apt/apt/usr/bin/mongorestore
MONGORESTORE_PATH=
```

### Anti-Patterns to Avoid

- **Assuming `mongodump` is on PATH without verification:** Aptfile installs to `/layers/...` not standard `/usr/bin`. Never hardcode `mongodump` as a bare command without the env var override being available.
- **Using `execSync` with shell=true for binary version check:** Prefer `execFileSync` (no shell spawned), safer and throws cleanly on non-zero exit.
- **Silently swallowing binary-not-found at startup:** D-06 is "fail loud." A caught error that only logs a warning leaves the server running with no backup capability — the failure must be thrown or cause a non-zero exit.
- **Running the startup check synchronously inside `app.listen` callback:** `app.listen` fires after the server is already accepting connections. The check belongs in the `connectDb().then()` chain, before `app.listen`.
- **Logging MongoDB URI in any binary check context:** Even though the version check does not use the URI, establish the no-URI-logging discipline now so it transfers naturally to backup service implementation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking if binary exists | Custom file-system probe using `fs.existsSync` across multiple paths | `execFileSync(binaryPath, ['--version'])` + catch | The version check IS the existence check — if it throws, the binary is absent or broken; no need for separate path scanning |
| PATH env var injection for non-standard binary locations | Custom shell wrapper script | `MONGODUMP_PATH` env var read in Node.js + passed to `execFileSync` as first arg | Env var override is simpler, testable, and aligns with D-08 |
| Repository/GPG setup for APT package install | `:repo:` Aptfile lines + GPG key management | Direct `.deb` URL in Aptfile | MongoDB's CDN serves versioned .deb files directly; no repo configuration needed |

**Key insight:** The binary check code is 10 lines; the complexity is entirely operational (which path, which package). Keep code minimal — the real work is deploy-and-observe.

---

## Common Pitfalls

### Pitfall 1: Aptfile Not Detected — Wrong Location

**What goes wrong:** App Platform does not trigger the Aptfile buildpack and the binary is never installed.

**Why it happens:** The Aptfile must be at the source root of the App Platform component. If the backend component has `Source Directory: backend` in the App Platform config, the Aptfile goes at `backend/Aptfile`. If App Platform's source root is the repo root, the Aptfile goes at the repo root. Placing it in the wrong directory means the buildpack never sees it.

**How to avoid:** Confirm App Platform's "Source Directory" setting for the backend component before committing the Aptfile. Check the App Platform build logs for "Aptfile detected" or the `digitalocean_apt` layer being invoked.

**Warning signs:** No `[backup] mongodump binary OK` line in startup logs after deploy. App Platform build logs show no reference to `digitalocean_apt`.

### Pitfall 2: Binary Installs But Is Not on PATH

**What goes wrong:** `mongodump --version` from startup check throws ENOENT even though the binary was installed via Aptfile.

**Why it happens:** Aptfile buildpack installs to `/layers/digitalocean_apt/apt/usr/bin/` (MEDIUM confidence based on community evidence from a Java user experiencing identical issue). This directory is NOT automatically added to PATH. Bare `mongodump` invocation fails with ENOENT.

**How to avoid:** The `MONGODUMP_PATH` env var (D-08) is the mitigation. After first deploy, check runtime logs for the `which mongodump` output — it reveals the actual path. Set `MONGODUMP_PATH` in App Platform env vars to that full path if bare `mongodump` fails.

**Warning signs:** Startup log shows "FATAL: mongodump binary not found" even though the build log shows the .deb was downloaded and installed.

### Pitfall 3: Wrong Ubuntu Version in .deb URL

**What goes wrong:** The Aptfile .deb URL targets the wrong Ubuntu version, causing install failure or library mismatch at runtime.

**Why it happens:** App Platform Node.js buildpack runs on Ubuntu 22.04 (jammy) as of 2024-2025, but this could change. Using a Ubuntu 20.04 (focal) .deb causes either install failure or at runtime: `error while loading shared libraries`.

**How to avoid:** Use the Ubuntu 22.04 (jammy) x86_64 .deb URL. Verify the Ubuntu version on App Platform before deploying if unsure. Check App Platform build logs for OS version info.

**Warning signs:** App Platform build log shows `dpkg` errors. Or binary exists but crashes with shared library error.

### Pitfall 4: MongoDB Atlas IP Allowlist Blocking Backup Job

**What goes wrong:** The backup job (Phase 34) will call mongodump with `--uri="$MONGO_URL"`. If Atlas's IP allowlist does not include App Platform's egress IP, the dump fails with an authentication/connection timeout error.

**Why it happens:** The existing MONGO_URL connection from Node.js (Mongoose driver) works because it was already allowlisted. But Phase 33 must confirm this works for mongodump (a separate process, same network egress) too. App Platform does NOT have a stable outbound IP by default — it uses dynamic IP ranges. The existing MONGO_URL allowlist setting must be verified.

**How to avoid:** In Phase 33, confirm what IP range or rule is already in the Atlas allowlist for the current App Platform deployment. If it's `0.0.0.0/0` (allow all), mongodump will work without change. If it's a specific IP or CIDR, confirm the range covers App Platform's current egress. Document the finding. If a static egress IP is needed, App Platform offers dedicated egress IP (paid feature) that can be added to the Atlas allowlist.

**Warning signs:** This cannot be confirmed until Phase 34's first backup run. Phase 33's success criterion #4 ("Atlas IP allowlist confirmed") is satisfied by documenting the current allowlist state, not by running a backup.

### Pitfall 5: `execFileSync` at Startup Blocks Event Loop Briefly

**What goes wrong:** `execFileSync` is synchronous and blocks Node.js while mongodump prints its version string. For 50–200ms, no requests are served.

**Why it happens:** It's a synchronous child_process call.

**How to avoid:** This is acceptable for a one-time startup check (same pattern used by many frameworks). The alternative is `execFile` (async) with a promise wrapper — but for a startup gate check, synchronous is fine and simpler. Document this as intentional. If it ever becomes a concern, wrap in async/await with `util.promisify`.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Admin Route Pattern (from index.js ~line 3147)
```javascript
// Source: backend/index.js — POST /admin/update-exchange-rate
app.post(
  '/admin/update-exchange-rate',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      await runExchangeRateUpdate();
      res.json({ success: true, message: '...' });
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

### Existing Startup Init Pattern (from index.js ~line 822)
```javascript
// Source: backend/index.js
connectDb()
  .then(() => {
    initializeExchangeRate();  // existing call
    // verifyMongodumpBinary() goes here
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err?.message || err);
  });
```

### Existing env.example Section Format (from backend/env.example)
```bash
# ---------------------------------------------
# DigitalOcean Spaces (S3 compatible)
# REQUIRED in production if you rely on uploads (App Platform filesystem is ephemeral)
# ---------------------------------------------
SPACES_BUCKET=
SPACES_REGION=
# Example: https://fra1.digitaloceanspaces.com
SPACES_ENDPOINT=
SPACES_KEY=
SPACES_SECRET=
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mongodb-org-tools` (bundled with server) | `mongodb-database-tools` (separate package, versioned independently since 4.4) | MongoDB 4.4 (2020) | Must use `mongodb-database-tools` package, not `mongodb-org-tools` |
| App Platform buildpacks using heroku legacy paths | DigitalOcean's own buildpack layer (`/layers/digitalocean_apt/`) | DO App Platform GA (~2021) | Binaries are NOT at `/usr/bin` after Aptfile install — they're in a buildpack layer |

**Deprecated/outdated:**
- `mongodb-org-tools` package: superceded by `mongodb-database-tools`; the old package may still exist in default Ubuntu repos (in older versions) but is stale. Use the official MongoDB .deb from MongoDB's own download center.

---

## Open Questions

1. **Exact PATH after Aptfile install on App Platform**
   - What we know: Community evidence says `/layers/digitalocean_apt/apt/usr/bin/` for similar packages (Java); documentation says "packages may not be on PATH"; the `MONGODUMP_PATH` env var handles this.
   - What's unclear: Whether DigitalOcean's buildpack automatically exports the binary path for `.deb`-installed packages (some sources suggest it does for the layer's `/bin` paths).
   - Recommendation: Startup check logs `which mongodump` output. After first deploy to App Platform, read the log and set `MONGODUMP_PATH` in App Platform env vars to the confirmed path. This is PHASE 33's primary deliverable.

2. **Current Atlas IP allowlist state for App Platform**
   - What we know: Mongoose connection from Node.js works (app is running in production). mongodump uses the same outbound IP as the app process.
   - What's unclear: Whether Atlas is set to `0.0.0.0/0` or a specific IP range for the App Platform deployment.
   - Recommendation: Phase 33 should include a task to check Atlas allowlist settings and document them in a short note. No code change needed unless allowlist is overly restrictive.

3. **Ubuntu version on App Platform Node.js buildpack**
   - What we know: App Platform uses Ubuntu-based containers; the Node.js buildpack documentation does not pin the OS version explicitly.
   - What's unclear: Whether it is Ubuntu 20.04 (focal) or 22.04 (jammy) at time of this deploy.
   - Recommendation: Check App Platform build logs for OS version. Default to Ubuntu 22.04 (jammy) .deb URL — this is the most common as of 2024-2025. If build fails, switch to the 20.04 (focal) URL.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| DigitalOcean App Platform | Aptfile deploy | ✓ (production target) | — | — |
| MongoDB Atlas | Backup job (Phase 34) | ✓ (existing MONGO_URL) | — | — |
| mongodb-database-tools (system binary) | Startup check (D-06) | ✗ local dev | — | Skip check when `NODE_ENV !== 'production'` OR when `MONGODUMP_PATH` is unset and binary not found |
| aws-sdk v2 | Backup Spaces client (Phase 34) | ✓ (already in package.json) | 2.1693.0 | — |
| node-cron | Backup scheduler (Phase 34) | ✓ (already in package.json) | 3.0.3 | — |

**Missing dependencies with no fallback:**
- None that block Phase 33. The binary check is the deliverable — absence of the binary is the finding Phase 33 exists to resolve.

**Missing dependencies with fallback:**
- `mongodb-database-tools` not available in local dev: startup check should NOT fail loudly in non-production (`NODE_ENV !== 'production'`). Log a warning and continue. Only fail-loud in production where the Aptfile should have installed it.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `backend/vitest.config.js` |
| Quick run command | `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BKUP-04 | `verifyMongodumpBinary()` logs version and does not throw when binary found | unit | `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js` | ❌ Wave 0 |
| BKUP-04 | `verifyMongodumpBinary()` throws when binary not found | unit | same | ❌ Wave 0 |
| BKUP-04 | `GET /admin/backup-status` returns 401 for unauthenticated requests | unit | `cd backend && npm test -- tests/integration/backupStatus.test.js` | ❌ Wave 0 |
| BKUP-04 | `GET /admin/backup-status` returns binaryFound=true when binary available | unit | same | ❌ Wave 0 |
| BKUP-04 | env.example contains all 9 backup env vars | manual | review file diff | manual |
| BKUP-04 | Aptfile exists at `backend/Aptfile` with non-empty content | manual | `ls backend/Aptfile` | manual |

The actual binary presence on App Platform (success criterion #1: `mongodump --version` logged from deployed container) is a **deployment verification** step, not an automated unit test. It is manual-only because it requires a live App Platform container.

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- tests/unit/jobs/backupVerification.test.js`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/unit/jobs/backupVerification.test.js` — covers BKUP-04 unit behaviors (mock child_process execFileSync: success path + ENOENT path)
- [ ] `backend/tests/integration/backupStatus.test.js` — covers `/admin/backup-status` endpoint authentication and response shape

*(Existing test infrastructure: `backend/vitest.config.js`, `backend/tests/setup.js`, and existing unit/middleware test helpers cover shared fixtures — no new framework setup needed.)*

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 33 |
|-----------|-------------------|
| Monolithic `backend/index.js` — all routes added there | Startup check and `/admin/backup-status` both go in `index.js`, following existing pattern |
| Admin routes protected with `fetchUser, requireAdmin` middleware chain | `/admin/backup-status` must use this chain exactly |
| `adminRateLimiter` applied to all admin endpoints | Must be applied to the new endpoint |
| No `/api` prefix on routes (post-SSR migration) | Endpoint path is `/admin/backup-status`, not `/api/admin/backup-status` |
| env vars grouped by concern in `env.example` with section headers and comments | New backup section follows existing format with `# ---` dividers and inline comments |
| `aws-sdk` (v2) already in dependencies | Backup service uses v2 SDK, not v3. Do NOT introduce aws-sdk v3. |
| App Platform filesystem is ephemeral | Backup archives must never be written to local disk (Phase 34 concern, but relevant for design) |

---

## Sources

### Primary (HIGH confidence)
- DigitalOcean App Platform Aptfile documentation — https://docs.digitalocean.com/products/app-platform/reference/buildpacks/aptfile/ — Aptfile format and limitations
- Node.js child_process documentation — https://nodejs.org/api/child_process.html — execFileSync behavior, error handling
- `backend/jobs/exchangeRateJob.js` (codebase) — node-cron pattern to follow
- `backend/index.js` (codebase) — admin route pattern, startup init pattern, existing S3 client setup
- `backend/env.example` (codebase) — env var documentation format

### Secondary (MEDIUM confidence)
- DigitalOcean community Q&A on Aptfile binary PATH — https://www.digitalocean.com/community/questions/app-platform-installing-packages-using-aptfile — `/layers/digitalocean_apt/apt/usr/bin/` path (community-sourced, one example with Java; not official docs)
- heroku-buildpack-apt README — https://github.com/heroku/heroku-buildpack-apt — `:repo:` and direct URL Aptfile syntax
- MongoDB Database Tools installation Linux — https://www.mongodb.com/docs/database-tools/installation/installation-linux/ — package name and installation method
- DigitalOcean App Platform dedicated egress IP — https://docs.digitalocean.com/products/app-platform/how-to/add-ip-address/ — static IP option for Atlas allowlisting

### Tertiary (LOW confidence)
- Community: binary PATH being `/layers/digitalocean_apt/apt/usr/bin/` is inferred from one Java user's experience; not confirmed for Node.js + mongodb-database-tools specifically. The startup `which mongodump` log is the only reliable verification.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — node-cron and aws-sdk are already installed; child_process is built-in
- Architecture: HIGH — all patterns directly mirror existing codebase conventions (exchangeRateJob, admin routes, env.example format)
- Aptfile binary PATH: MEDIUM — community evidence, not official docs; startup verification required
- Pitfalls: HIGH — derived from first-principles (PATH mechanics) and official DO docs (shared library limitation)
- Atlas IP allowlist: MEDIUM — current state unknown without checking the Atlas console

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (stable infrastructure; Aptfile behavior unlikely to change; MongoDB .deb URL should be re-verified if > 30 days old)
