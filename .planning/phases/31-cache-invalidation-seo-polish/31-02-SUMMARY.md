---
phase: 31-cache-invalidation-seo-polish
plan: 02
subsystem: seo
tags: [hreflang, sitemap, bilingual, seo, google-search]

# Dependency graph
requires:
  - phase: 30-frontend-display-ssr-updates
    provides: Bilingual product field selection and SSR rendering with fallback chains
provides:
  - Conditional hreflang rendering preventing duplicate content penalties
  - Translation status detection via hasHebrewTranslation flag
  - Sitemap with conditional Hebrew URLs based on actual translations
affects: [seo, future-bilingual-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [conditional-hreflang-rendering, translation-completeness-checks]

key-files:
  created: []
  modified: [backend/routes/ssrDynamic.js, backend/views/partials/meta-tags.ejs, backend/views/pages/product.ejs, backend/routes/sitemap.js]

key-decisions:
  - "hreflang only bidirectional when both name_he AND description_he exist"
  - "Category and static pages always have bidirectional hreflang (translations guaranteed)"
  - "Untranslated products: English hreflang + x-default only, no Hebrew alternate"
  - "Sitemap excludes /he/product/slug URLs when translations missing"

patterns-established:
  - "Boolean(name_he && description_he) pattern for translation completeness"
  - "hasHebrewTranslation passed to EJS templates for conditional rendering"
  - "typeof hasHebrewTranslation !== 'undefined' check distinguishes product vs non-product pages"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 31 Plan 02: Conditional Hreflang Summary

**Hreflang tags and sitemap made conditional on Hebrew translation existence to prevent Google duplicate content penalties**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-16T09:31:07Z
- **Completed:** 2026-02-16T09:33:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Product pages with Hebrew translations emit full bidirectional hreflang (en + he + x-default)
- Product pages WITHOUT Hebrew translations emit English-only hreflang (en + x-default, no he alternate)
- Category and static pages always emit bidirectional hreflang (translations statically guaranteed)
- Sitemap conditionally includes /he/product/slug URLs only when translations exist
- Translation completeness determined by Boolean(product.name_he && product.description_he)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hasHebrewTranslation flag to product page SSR and make hreflang conditional** - `3deca35` (feat)
2. **Task 2: Make sitemap hreflang conditional for product pages based on translation status** - `cf7762f` (feat)

## Files Created/Modified
- `backend/routes/ssrDynamic.js` - Compute hasHebrewTranslation flag in renderProductPage, pass to pageData
- `backend/views/pages/product.ejs` - Pass hasHebrewTranslation to meta-tags partial include
- `backend/views/partials/meta-tags.ejs` - Conditional hreflang rendering based on hasHebrewTranslation
- `backend/routes/sitemap.js` - Select name_he/description_he, conditional hreflang and Hebrew URL inclusion

## Decisions Made

**Key decisions:**
- **Translation completeness requires both name AND description:** Partial translations (name only or description only) are considered incomplete. This prevents indexing Hebrew URLs with mixed English/Hebrew content.
- **Non-product pages unaffected by hasHebrewTranslation:** Category pages, static pages (about, contact, etc.), and cart pages do NOT set hasHebrewTranslation (remains undefined). The conditional check `typeof hasHebrewTranslation !== 'undefined' && hasHebrewTranslation === false` ensures these pages get full bidirectional hreflang.
- **Sitemap mirrors meta-tags logic:** Untranslated products appear only with /en/product/slug URL in sitemap (no /he/product/slug entry), matching the hreflang behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly with no blocking issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Conditional hreflang complete - ready for cache headers implementation (31-01 if not already complete, or next phase)
- Google Search Console will correctly interpret hreflang signals once deployed
- No blockers for subsequent SEO optimization work

---
*Phase: 31-cache-invalidation-seo-polish*
*Completed: 2026-02-16*

## Self-Check: PASSED

All files verified:
- FOUND: backend/routes/ssrDynamic.js
- FOUND: backend/views/partials/meta-tags.ejs
- FOUND: backend/views/pages/product.ejs
- FOUND: backend/routes/sitemap.js

All commits verified:
- FOUND: 3deca35
- FOUND: cf7762f
