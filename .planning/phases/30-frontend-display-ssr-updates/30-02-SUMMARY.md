---
phase: 30-frontend-display-ssr-updates
plan: 02
subsystem: frontend
tags: [bilingual, client-side, cart, categoriesView, MVC]

# Dependency graph
requires:
  - phase: 29-admin-ui-translation-workflow
    provides: Bilingual product fields in database (name_en, name_he, description_en, description_he)
provides:
  - Client-side views display product names/descriptions in user's selected language
  - Cart shows product names in current language (not add-time language)
  - Language switching updates all product text without page refresh
affects: [31-cache-invalidation-seo-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [bilingual field selection with fallback chain, language-aware cart rendering]

key-files:
  created: []
  modified:
    - frontend/js/Views/categoriesView.js
    - frontend/js/model.js
    - frontend/js/Views/cartView.js

key-decisions:
  - "Use bilingual field helpers (getProductName/getProductDescription) for consistent fallback logic"
  - "Store both name_en and name_he in cart localStorage for language switching"
  - "Re-render cart on language switch to update product names dynamically"
  - "Backward compatible fallback: name_en || name || '' ensures existing cart items work"

patterns-established:
  - "Bilingual field selection pattern: Hebrew checks name_he || name_en || name, English checks name_en || name"
  - "Cart language independence: Store bilingual fields, display based on current language setting"
  - "Language switch handling: Update displayed text from stored bilingual data without API calls"

# Metrics
duration: 4 min
completed: 2026-02-15
---

# Phase 30 Plan 02: Client-Side Bilingual Display + Cart Bilingual Names Summary

**Client-side views now display product names and descriptions in user's selected language with English fallback, and cart shows product names in current language.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T19:46:06Z
- **Completed:** 2026-02-15T19:50:42Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments

- categoriesView displays product names/descriptions based on user's language setting (eng/heb)
- Language switcher updates product text dynamically without page reload
- Cart stores bilingual name fields (name_en, name_he) in localStorage
- Cart displays product names in current language, not language when item was added
- Backward compatible with existing cart items via fallback to legacy title field

## Task Commits

Each task was committed atomically:

1. **Task 1: Add bilingual field selection to categoriesView** - `f885001` (feat)
2. **Task 2: Add bilingual name fields to cart data flow** - `f3ee75d` (feat)

**Plan metadata:** (to be committed)

## Files Created/Modified

- `frontend/js/Views/categoriesView.js` - Added getProductName/getProductDescription helpers, extract bilingual fields from SSR data attributes, update product markup to use bilingual names, language switch updates displayed text, modal add-to-cart includes bilingual fields
- `frontend/js/model.js` - Extract name_en/name_he from product dataset, store bilingual fields in cart localStorage data
- `frontend/js/Views/cartView.js` - Added _getItemName helper for language-based name selection, update cart rendering to use current language name, re-render cart on language switch

## Decisions Made

**Technical decisions:**
1. **Bilingual field helpers over inline selection** - Created getProductName/getProductDescription methods in categoriesView for consistent fallback logic. Alternative was inline conditionals in each location. Helper approach ensures consistent fallback chain (name_he || name_en || name for Hebrew, name_en || name for English) across all rendering paths.

2. **Store both languages in cart** - Cart items store both name_en and name_he in localStorage. Alternative was storing only current language name. Storing both enables language switching without re-fetching products from API, better UX.

3. **Re-render cart on language switch** - setPageSpecificLanguage re-renders cart items to update product names. Alternative was selective DOM updates. Re-render approach reuses existing render() logic, simpler implementation.

4. **Backward compatibility via fallback** - Fallback chain `item.name_en || item.title || ''` ensures old cart items without bilingual fields still display. No localStorage migration needed, graceful degradation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 31: Cache Invalidation & SEO Polish**

Client-side bilingual display complete. SSR templates (Plan 01) and client-side views (Plan 02) now both use bilingual fields with consistent fallback logic. Language switching works across category pages and cart. Next phase can implement cache invalidation for bilingual content updates and verify SEO signals (hreflang, inLanguage) point to actually different content.

**Validation notes:**
- Existing SSR-rendered products already have data-name-en/data-name-he attributes (added in Plan 01)
- Client-side extractProductsFromDOM reads these attributes and populates products array
- Modal add-to-cart passes bilingual fields to model.handleAddToCart
- Language switcher triggers updateExistingProductText which updates displayed names/descriptions
- Cart language switching now functional (re-renders cart items with new language names)

**Known limitations:**
- Description bilingual fields (description_en/description_he) not yet extracted from SSR in extractProductsFromDOM - plan only specified name fields. Description fallback uses full description from data attribute. Can be enhanced in future if needed.
- Product API responses (/productsByCategory) return full product objects including bilingual fields - no changes needed for client-side API fetch path.

---
*Phase: 30-frontend-display-ssr-updates*
*Completed: 2026-02-15*
