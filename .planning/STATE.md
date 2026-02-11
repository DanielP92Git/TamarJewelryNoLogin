# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers
**Current focus:** v1.4 Phase 26 — Caching, Performance & Verification

## Current Position

Milestone: v1.4 SEO & Marketing Foundation
Phase: 25 of 26 (Dynamic SSR, Structured Data, and Sitemap)
Plan: 04 of 04 (all complete)
Status: Complete
Last activity: 2026-02-11 — Phase 25 complete (category SSR, product pages, sitemap, SSR awareness)

Progress: Phases 1-25 complete (v1.0-v1.3 + Phase 23-25). v1.4: [███████░░░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 91 (v1.0: 5, v1.1: 33, v1.2: 25, v1.3: 14, v1.4: 14)
- Average duration: ~5 min/plan
- Total execution time: ~28.2 hours

**Recent Trend:**
- Last 5 plans: 6-9 min
- Trend: Dynamic SSR and structured data (6 min for category SSR, 6 min for sitemap, 9 min for product pages, 6 min for SSR awareness)

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
- [Phase 24-01]: Home page title without suffix (brand IS the title, other pages get "| Tamar Kfir Jewelry" suffix)
- [Phase 24-01]: Logo image for English, text brand for Hebrew in header (matches frontend pattern)
- [Phase 24-01]: Footer uses clean category URLs (/en/necklaces) preparing for Phase 25 SSR
- [Phase 24-01]: Hreflang x-default points to English version as international fallback
- [Phase 24-02]: Server-side bilingual content rendering for about, contact, workshop, policies pages
- [Phase 24-02]: All text content rendered server-side (not empty containers) for SEO
- [Phase 24-02]: HTML structure preserved exactly to match existing frontend CSS
- [Phase 24-02]: Alt text localized for all images (accessibility + SEO)
- [Phase 24-03]: Home page shows category grid only (not product grid) - matches existing frontend UX while preparing infrastructure for Phase 25
- [Phase 24-03]: Currency based on language for now (heb→ILS, eng→USD) - cookie-based currency in future phases
- [Phase 24-03]: Product queries limited to 20 items for performance
- [Phase 24-03]: Graceful error handling for DB failures (page renders without products rather than 500 error)
- [Phase 24-04]: Deployment merge from 2 DigitalOcean components to 1 unified Express service
- [Phase 24-04]: Frontend builds before backend in deployment (chained build_command)
- [Phase 24-04]: All sensitive env vars configured via DigitalOcean dashboard (not in yaml file)
- [Phase 24-04]: All 10 SSR pages verified end-to-end with meta tags before phase completion
- [Phase 24-05]: Verification gap resolved as false positive (home page never rendered products in frontend)
- [Phase 24-05]: Unused Product query removed from home page handler for performance
- [Phase 24-05]: All static page handlers follow consistent buildPageData pattern
- [Phase 25-01]: Use English product slugs for both language versions
- [Phase 25-01]: Map URL slugs with hyphens to camelCase MongoDB category values
- [Phase 25-01]: Use data-ssr flag to enable client-side SSR detection and prevent re-rendering
- [Phase 25-03]: XML sitemap at /sitemap.xml with all public pages in both languages (static, category, product)
- [Phase 25-03]: Hreflang alternates on every URL with x-default pointing to English for international SEO
- [Phase 25-03]: Image sitemap extension included for product images (Google Image Search visibility)
- [Phase 25-03]: Lastmod dates use actual product.date field, not current timestamp for accurate change tracking
- [Phase 25-03]: Sitemap cache-control set to 1 hour for CDN efficiency
- [Phase 25-02]: Product pages use product name as dynamic title (not static "Product Details")
- [Phase 25-02]: Manual pageData construction for product-specific meta instead of buildPageData
- [Phase 25-02]: DB_TO_URL_CATEGORY reverse mapping for breadcrumb category links
- [Phase 25-02]: Error and 404 pages added with inline styles for minimal dependencies
- [Phase 25-04]: Client-side JS detects data-ssr flag and skips duplicate product fetching
- [Phase 25-04]: Product data extracted from SSR DOM to populate products array
- [Phase 25-04]: Cart page rendered as SSR shell with client-side content population

### Pending Todos

None.

### Blockers/Concerns

- Product slugs not populated in database — product detail pages work but cannot be accessed until slug migration is completed (Phase 23 follow-up needed)
- Payment return URLs hardcoded to old paths — must update simultaneously with URL migration (future phase)
- Environment variables must be configured in DigitalOcean dashboard before first deployment
- First production deployment should go to staging environment for validation

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed Phase 25 (all 4 plans — category SSR, product pages, sitemap, SSR awareness)
Resume file: None

## Quick Tasks Completed

Quick tasks are maintenance/bug fixes separate from planned phases:

1. **quick-001** (2026-02-08): Fixed error handling in addToUserStorage and createLocalStorage
   - Added .catch() for network errors, try-catch for storage quota
   - Commits: bfa6d54 (fix), 667d621 (test)
   - Summary: .planning/quick/001-fix-error-handling-bugs-in-model-js-add/001-SUMMARY.md
