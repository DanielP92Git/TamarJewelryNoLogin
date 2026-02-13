# Requirements: Tamar Kfir Jewelry

**Defined:** 2026-02-13
**Core Value:** A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers

## v1.5 Requirements

Requirements for Bilingual Product Content milestone. Each maps to roadmap phases.

### Schema & Migration

- [ ] **SCHEMA-01**: Product schema has bilingual fields (name_en, name_he, description_en, description_he)
- [ ] **SCHEMA-02**: Existing products migrated — current English data populates name_en/description_en fields
- [ ] **SCHEMA-03**: Legacy name/description fields maintained during transition for backward compatibility
- [ ] **SCHEMA-04**: Cart handles transition from single-language to bilingual product names gracefully

### Translation Service

- [ ] **TRANS-01**: Google Cloud Translation API v3 integrated as backend service
- [ ] **TRANS-02**: Backend translation endpoint (POST /admin/translate) for on-demand admin use
- [ ] **TRANS-03**: Translation service caches results in memory to reduce API costs
- [ ] **TRANS-04**: Translation errors handled gracefully — admin can still save with manual entry
- [ ] **TRANS-05**: Bulk operations use batching with delays to respect API rate limits

### Admin Workflow

- [ ] **ADMIN-01**: Admin product form shows side-by-side Hebrew and English fields for name and description
- [ ] **ADMIN-02**: "Translate" button translates content between Hebrew and English on demand
- [ ] **ADMIN-03**: Admin can manually edit translated text before saving
- [ ] **ADMIN-04**: Product list shows translation status indicators (translated / needs translation)
- [ ] **ADMIN-05**: Bulk translate tool translates all products missing a language at once
- [ ] **ADMIN-06**: Bulk translate shows progress indicator and handles API rate limits

### Display

- [ ] **DISP-01**: SSR product page shows correct language name/description based on URL (/en/ or /he/)
- [ ] **DISP-02**: SSR category page shows correct language name/description for product cards
- [ ] **DISP-03**: Client-side views show correct language with same logic as SSR
- [ ] **DISP-04**: Cart displays product names in the user's current language
- [ ] **DISP-05**: Graceful fallback to English when Hebrew translation is missing
- [ ] **DISP-06**: JSON-LD structured data uses language-specific content with inLanguage property
- [ ] **DISP-07**: OG meta tags use localized product descriptions for social sharing

### Cache

- [ ] **CACHE-01**: Product update clears cached pages for both /en/ and /he/ variants
- [ ] **CACHE-02**: Bulk translation triggers cache invalidation for all affected products
- [ ] **CACHE-03**: Category cache cleared when products in that category are translated

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Translation Enhancements

- **TRANS-06**: Translation memory/glossary for consistent jewelry terminology
- **TRANS-07**: Translation quality confidence indicators
- **TRANS-08**: Preview translated content in product modal before saving
- **TRANS-09**: Translation cost tracking dashboard

### Content Expansion

- **CONT-01**: Bilingual category names and descriptions
- **CONT-02**: Bilingual static page content (about, workshop, policies)
- **CONT-03**: Third language support (e.g., Russian, Arabic)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time translation during typing | Wastes API quota, admin should write first then translate |
| Auto-translate without admin review | Machine translation always needs human review for quality |
| Locked translation fields | Admin must always be able to edit translations manually |
| Separate translation manager page | Overkill for ~94 products, inline editing sufficient |
| Language-specific slugs (/he/product/hebrew-slug) | English-only slugs simpler for routing, consistent with current approach |
| Client-side translation (browser-side API calls) | Security risk exposing API credentials, server-side is correct |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | Phase 27 | Pending |
| SCHEMA-02 | Phase 27 | Pending |
| SCHEMA-03 | Phase 27 | Pending |
| SCHEMA-04 | Phase 27 | Pending |
| TRANS-01 | Phase 28 | Pending |
| TRANS-02 | Phase 28 | Pending |
| TRANS-03 | Phase 28 | Pending |
| TRANS-04 | Phase 28 | Pending |
| TRANS-05 | Phase 28 | Pending |
| ADMIN-01 | Phase 29 | Pending |
| ADMIN-02 | Phase 29 | Pending |
| ADMIN-03 | Phase 29 | Pending |
| ADMIN-04 | Phase 29 | Pending |
| ADMIN-05 | Phase 32 | Pending |
| ADMIN-06 | Phase 32 | Pending |
| DISP-01 | Phase 30 | Pending |
| DISP-02 | Phase 30 | Pending |
| DISP-03 | Phase 30 | Pending |
| DISP-04 | Phase 30 | Pending |
| DISP-05 | Phase 30 | Pending |
| DISP-06 | Phase 30 | Pending |
| DISP-07 | Phase 30 | Pending |
| CACHE-01 | Phase 31 | Pending |
| CACHE-02 | Phase 31 | Pending |
| CACHE-03 | Phase 31 | Pending |

**Coverage:**
- v1.5 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after roadmap creation*
