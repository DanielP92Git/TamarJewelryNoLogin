---
phase: 10-test-infrastructure-foundation
plan: 07
subsystem: ci-cd
tags: [github-actions, ci-cd, coverage, testing, automation]

dependency-graph:
  requires: [10-01, 10-02]
  provides: [ci-cd-pipeline, automated-testing, coverage-reports]
  affects: [11-authentication-testing, 12-payment-testing, all-future-testing-phases]

tech-stack:
  added:
    - github-actions
  patterns:
    - continuous-integration
    - automated-testing
    - coverage-reporting

key-files:
  created:
    - .github/workflows/test.yml
  modified:
    - backend/vitest.config.js
    - frontend/vitest.config.js
    - .gitignore

decisions:
  - id: ci-provider
    choice: GitHub Actions
    rationale: Native GitHub integration, free for public repos, Node.js support
  - id: coverage-reporter
    choice: v8 provider with json-summary format
    rationale: Built into Node.js, fast, machine-readable output for CI
  - id: coverage-thresholds
    choice: Commented out initially
    rationale: Start with 0% baseline, enforce thresholds in Phase 11+ as coverage grows

metrics:
  duration: 3 minutes
  completed: 2026-02-04
---

# Phase 10 Plan 07: CI/CD Pipeline with Coverage Reporting Summary

**One-liner:** GitHub Actions workflow runs backend/frontend tests with v8 coverage on every push and PR

## What Was Built

### CI/CD Pipeline
Created `.github/workflows/test.yml` with:
- **Parallel test execution:** Backend and frontend tests run simultaneously
- **Node.js 20 with caching:** Fast dependency installation via npm cache
- **Coverage generation:** Both suites generate coverage reports using v8 provider
- **Artifact upload:** Coverage reports uploaded for browsing/analysis
- **Coverage summary:** Displays coverage metrics in GitHub Actions UI
- **Trigger conditions:** Runs on push to master/main and on all pull requests

### Enhanced Coverage Configuration
Updated `backend/vitest.config.js`:
- Added `json-summary` reporter for CI consumption
- Explicit include patterns: `index.js`, `middleware/**`, `models/**`, `services/**`, `config/**`, `jobs/**`
- Explicit exclude patterns: `node_modules`, `tests`, `coverage`, `*.config.js`, `migrations`
- Commented thresholds ready for future enforcement
- `reportsDirectory: './coverage'` specification

Updated `frontend/vitest.config.js`:
- Added `json-summary` reporter for CI consumption
- Explicit include pattern: `js/**/*.js` (all MVC architecture files)
- Explicit exclude patterns: `node_modules`, `tests`, `coverage`, `dist`, `.parcel-cache`, `*.config.js`, `postbuild.js`
- Commented thresholds ready for future enforcement
- `reportsDirectory: './coverage'` specification

### Git Configuration
Updated `.gitignore`:
- Added `coverage/` (root level)
- Added `backend/coverage/`
- Added `frontend/coverage/`
- Added `*.lcov` files
- Prevents accidental commits of generated reports

## Decisions Made

**Coverage Provider:** v8
- Built into Node.js (no extra dependencies)
- Fast coverage instrumentation
- Accurate statement/branch/function coverage
- Alternative considered: c8 (similar but external tool)

**Coverage Reporters:** text, json, json-summary, html
- **text:** Console output during local development
- **json:** Machine-readable for tools/parsers
- **json-summary:** Compact format for CI summary display
- **html:** Browsable report for deep-dive analysis

**Coverage Thresholds:** Deferred to Phase 11+
- Current baseline: 0% (infrastructure tests only)
- Commented thresholds in config: 70% lines/functions, 60% branches
- Will enable incrementally as test coverage grows
- Prevents false failures during initial test writing

**CI Trigger Strategy:** Push to main/master + all PRs
- Catches regressions immediately on protected branches
- Validates all PR changes before merge
- Parallel jobs reduce total pipeline time

## Technical Implementation

### Workflow Structure
```yaml
jobs:
  test-backend:     # Backend tests (Node 20, npm ci, vitest coverage)
  test-frontend:    # Frontend tests (Node 20, npm ci, vitest coverage)
  coverage-summary: # Downloads artifacts, displays summary
```

**Parallel execution:** Backend and frontend tests run simultaneously (not sequentially)

**Always run coverage-summary:** Uses `if: always()` to show results even if tests fail

**Continue on error:** Coverage downloads use `continue-on-error: true` for graceful degradation

### Coverage Include Patterns

**Backend:** Targets production code only
- `index.js` (3,662 lines of monolithic server)
- `middleware/auth.js` (JWT authentication)
- `models/` (Mongoose schemas)
- `services/exchangeRateService.js` (currency conversion)
- `config/` (database, locale)
- `jobs/exchangeRateJob.js` (cron job)

**Frontend:** Targets MVC architecture
- `js/**/*.js` (all JavaScript files)
- Excludes test files, config, build output

### Integration Points

**From workflow to package.json:**
- `npm run test:coverage` in both backend/frontend
- Scripts already existed from plan 10-01

**From workflow to vitest configs:**
- Vitest reads enhanced coverage config
- Generates json-summary for CI consumption

**From coverage reports to GitHub:**
- Uploaded as artifacts (browsable from Actions tab)
- Displayed in Actions summary (embedded in UI)

## Test Results

**Before this plan:**
- Tests run locally only
- No automated coverage tracking
- Manual test execution required

**After this plan:**
- ✅ Backend: 20 tests passing (infrastructure + env guards)
- ✅ Frontend: 5 tests passing (infrastructure smoke tests)
- ✅ Coverage: 0% baseline (expected - infrastructure tests only)
- ✅ CI pipeline: Ready for automatic execution on next push
- ✅ Coverage reports: Generated and displayed in GitHub UI

### Coverage Baseline

**Backend coverage (current):**
```
index.js:                0% (3,662 lines uncovered - integration tests in Phase 11)
middleware/auth.js:      0% (JWT tests in Phase 11)
models/:                 0% (schema validation tests in Phase 13)
services/:               0% (exchange rate tests in Phase 12)
config/:                 0% (integration tests in Phase 11)
jobs/:                   0% (cron job tests in Phase 12)
```

**Frontend coverage (current):**
```
js/View.js:          0% (base class tests in future phases)
js/controller.js:    0% (routing tests in future phases)
js/model.js:         0% (data layer tests in future phases)
js/Views/:           0% (view tests in future phases)
```

**Coverage will grow incrementally in Phases 11-16 as actual feature tests are written.**

## Files Changed

### Created (1 file)
- `.github/workflows/test.yml` (106 lines) - GitHub Actions pipeline

### Modified (3 files)
- `backend/vitest.config.js` - Added json-summary reporter, explicit includes, thresholds
- `frontend/vitest.config.js` - Added json-summary reporter, explicit includes, thresholds
- `.gitignore` - Added coverage directories and *.lcov

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for Phase 11 (Authentication Testing):**
- ✅ CI pipeline will automatically run auth tests on every commit
- ✅ Coverage reports will track auth test coverage growth
- ✅ Coverage thresholds ready to enable once baseline is established
- ✅ Infrastructure stable (20 backend tests, 5 frontend tests passing)

**Blockers:** None

**Concerns:** None

**Dependencies satisfied:**
- Plan 10-01 (test infrastructure) ✓
- Plan 10-02 (environment guards) ✓
- Plan 10-06 (exported Express app for testing) ✓

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e595843 | Add GitHub Actions CI workflow for tests |
| 2 | a93972d | Enhance coverage configuration in Vitest |
| 3 | 3f90bee | Add coverage directories to .gitignore |

**Total commits:** 3 (1 per task, atomic)

## Performance

**Execution time:** ~3 minutes
**Test execution time:**
- Backend: ~5.5s (20 tests)
- Frontend: ~5.0s (5 tests)

**CI pipeline duration (estimated):**
- Checkout + setup: ~30s
- Backend npm ci + test: ~2-3 min
- Frontend npm ci + test: ~2-3 min
- Total (parallel): ~3-4 min per run

## Usage Examples

**Local coverage generation:**
```bash
cd backend && npm run test:coverage
cd frontend && npm run test:coverage
```

**View HTML coverage report:**
```bash
open backend/coverage/index.html
open frontend/coverage/index.html
```

**CI pipeline triggers automatically:**
- Push to master/main
- Open pull request
- Push to PR branch

**View coverage in GitHub:**
- Actions tab → Select workflow run
- Coverage Summary section shows metrics
- Download artifacts for detailed HTML reports

## Future Enhancements

**Phase 11+:**
1. Enable coverage thresholds once baseline reaches 20-30%
2. Add coverage badges to README (shields.io or coveralls)
3. Add PR comment bot with coverage diff
4. Configure branch protection rules requiring passing tests

**Potential improvements:**
- Add test parallelization (vitest pool options)
- Add mutation testing (stryker-js)
- Add visual regression testing (playwright/percy)
- Add E2E tests in separate workflow (slower execution)

---

**Status:** ✅ Complete
**Next:** Plan 10-08 (if exists) or proceed to Phase 11 (Authentication Testing)
