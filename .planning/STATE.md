# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers
**Current focus:** v1.4 Phase 24 — Static Page SSR + Meta Tags + Deployment Merge

## Current Position

Milestone: v1.4 SEO & Marketing Foundation
Phase: 24 of 26 (Static Page SSR + Meta Tags + Deployment Merge)
Plan: — (phase not yet planned)
Status: Ready to plan
Last activity: 2026-02-10 — Phase 23 complete (5/5 plans, verified)

Progress: Phases 1-23 complete (v1.0-v1.3 + Phase 23). v1.4: [██░░░░░░░░] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 82 (v1.0: 5, v1.1: 33, v1.2: 25, v1.3: 14, v1.4: 5)
- Average duration: ~4 min/plan
- Total execution time: ~26.1 hours

**Recent Trend:**
- Last 5 plans: 5-13 min
- Trend: Infrastructure setup (5 min for 23-02 slug schema, 13 min for 23-03 language middleware, 8 min for 23-05 robots.txt, 5 min for 23-04 legacy redirects)

*Updated after v1.3 milestone completion*

## Accumulated Context

### Decisions

All milestone decisions are logged in PROJECT.md Key Decisions table and phase summaries. See milestone archives in `.planning/milestones/` for detailed decision history.

Key decisions for v1.4:
- EJS chosen as template engine (existing HTML can be renamed to .ejs with zero syntax translation)
- Bilingual URLs with /en/ and /he/ prefixes (language determined by URL, not GeoIP for SSR pages)
- Deployment merge from 2 DigitalOcean components to 1 unified Express service
- Progressive enhancement: SSR renders complete HTML, client-side JS enhances with interactivity
- Pages include partials directly (no express-ejs-layouts) for simplicity (23-01)
- /:lang/test pattern with strict language validation and 301 redirect fallback (23-01)
- View caching enabled only in production for hot-reloading during development (23-01)
- English product names as slug source for global SEO reach (23-02)
- Counter-based slug collision handling (necklace, necklace-2) for readable URLs (23-02)
- Slugs are immutable after creation to preserve SEO authority and backlinks (23-02)
- Language detection priority: cookie > CDN headers > GeoIP > Accept-Language > default (23-03)
- Cookie stores both lang and currency, only updates on language change to preserve manual overrides (23-03)
- Invalid language prefixes redirect to /en equivalent with 301 for SEO (23-03)
- Trailing slashes normalized with 301 redirects, root redirects with 302 (temporary) (23-03)
- robots.txt blocks admin and API paths, 7 AI training bots blocked, 2 AI search bots allowed (23-05)
- robots.txt served with text/plain content type via setHeaders override (23-05)
- Static middleware placed before SSR routes for efficient asset serving (23-05)
- [Phase 23]: Legacy .html redirects use 301 status to preserve SEO authority
- [Phase 23]: Case-insensitive .html extension matching for legacy paths

### Pending Todos

None.

### Blockers/Concerns

- Deployment merge (2 components to 1) is a major infrastructure change — validate on static pages first (Phase 24)
- SSR-rendered HTML must match existing client-side JS output to avoid content flashing
- Payment return URLs hardcoded to old paths — must update simultaneously with URL migration
- 419 existing tests must continue passing through the architectural transition
- Monolithic backend (3,662 lines) may complicate SSR route integration

## Session Continuity

Last session: 2026-02-10
Stopped at: Phase 23 complete — ready to plan Phase 24
Resume file: None

## Quick Tasks Completed

Quick tasks are maintenance/bug fixes separate from planned phases:

1. **quick-001** (2026-02-08): Fixed error handling in addToUserStorage and createLocalStorage
   - Added .catch() for network errors, try-catch for storage quota
   - Commits: bfa6d54 (fix), 667d621 (test)
   - Summary: .planning/quick/001-fix-error-handling-bugs-in-model-js-add/001-SUMMARY.md
