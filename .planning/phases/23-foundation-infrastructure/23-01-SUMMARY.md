---
phase: 23-foundation-infrastructure
plan: 01
subsystem: ssr-rendering
tags: [ejs, templates, bilingual, server-side-rendering]
dependency_graph:
  requires: []
  provides: [ejs-view-engine, bilingual-test-route, template-structure]
  affects: [backend/index.js, backend/views]
tech_stack:
  added: [ejs@3.1.10]
  patterns: [ejs-templates, bilingual-routing, lang-dir-attributes]
key_files:
  created:
    - backend/views/layouts/main.ejs
    - backend/views/partials/header.ejs
    - backend/views/partials/footer.ejs
    - backend/views/pages/test.ejs
  modified:
    - backend/index.js
    - backend/package.json
decisions:
  - "EJS configured as view engine without express-ejs-layouts middleware - pages include partials directly for simplicity"
  - "Test route pattern uses /:lang/test with lang validation and 301 redirect for invalid languages"
  - "View caching enabled only in production for better development experience"
metrics:
  duration_minutes: 8
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  tests_passing: 447
  commits: [e4a0fa5, 1428c59]
  completed_date: 2026-02-10
---

# Phase 23 Plan 01: EJS View Engine Configuration Summary

**One-liner:** EJS template engine configured with bilingual test routes (/:lang/test) rendering correct lang/dir attributes for English and Hebrew

## Objective

Configure Express with EJS view engine, create the layout/partial template structure, and wire up a bilingual test route that proves SSR rendering works with correct lang and dir attributes.

## Tasks Completed

### Task 1: Install EJS and configure view engine in Express
**Commit:** e4a0fa5
**Files modified:** backend/package.json, backend/package-lock.json, backend/index.js

- Installed EJS v3.1.10 as dependency
- Configured Express view engine settings (engine, views directory, production caching)
- Added SSR test route at `/:lang/test` with language validation
- Route redirects invalid languages to `/en/test` with 301 status
- Route passes lang, dir, title, and path variables to template

### Task 2: Create EJS templates for SSR rendering
**Commit:** 1428c59
**Files created:** 4 template files

- Created `backend/views/layouts/main.ejs` - base HTML layout with lang/dir attributes (reference template for future use)
- Created `backend/views/partials/header.ejs` - minimal site header with logo link
- Created `backend/views/partials/footer.ejs` - copyright footer with dynamic year
- Created `backend/views/pages/test.ejs` - SSR verification page that includes partials directly
- Test page displays language code, direction, and renders correct Hebrew/English titles

## Verification Results

### Manual Testing
- `/en/test` route returns 200 with `lang="en" dir="ltr"` and title "Test Page"
- `/he/test` route returns 200 with `lang="he" dir="rtl"` and title "עמוד בדיקה"
- Invalid language routes (e.g., `/fr/test`) redirect to `/en/test` with 301
- Template includes work correctly (header and footer partials render)

### Test Suite Results
- All 447 existing backend tests continue to pass (1 skipped)
- No regressions introduced by EJS configuration
- Test duration: 73.55s

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Template structure approach**: Chose to have pages include partials directly rather than using express-ejs-layouts middleware. This keeps the implementation simple for now while the `layouts/main.ejs` serves as a reference template for Phase 24 when more sophisticated layout management may be needed.

2. **Language validation strategy**: Implemented strict language validation with 301 redirect to English as fallback. This ensures all SSR routes will have valid lang/dir attributes and prevents invalid language codes in URLs.

3. **View caching scope**: Enabled view caching only in production to allow template hot-reloading during development, improving developer experience during Phases 24-26 when building out more SSR pages.

## Foundation Established

This plan establishes the critical SSR rendering foundation that all subsequent plans in Phase 23-26 depend on:

- **EJS pipeline verified**: Template rendering works end-to-end from route → template → HTML response
- **Bilingual infrastructure**: lang/dir pattern established and working for both English (LTR) and Hebrew (RTL)
- **Template architecture**: Layout/partial/page structure created and documented
- **Route pattern**: `/:lang/path` URL structure validated and ready for expansion

## Next Steps

Phase 23 Plan 02 will build on this foundation to add the shared navigation component and language switcher, reusing the header partial created here.

## Self-Check

Verifying all claimed files and commits exist:

**Files:**
- ✓ backend/views/layouts/main.ejs exists
- ✓ backend/views/partials/header.ejs exists
- ✓ backend/views/partials/footer.ejs exists
- ✓ backend/views/pages/test.ejs exists

**Commits:**
- ✓ e4a0fa5 - chore(23-01): install EJS and configure view engine
- ✓ 1428c59 - feat(23-01): create EJS templates for SSR rendering

## Self-Check: PASSED
