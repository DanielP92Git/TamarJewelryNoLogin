# Requirements: Tamar Kfir Jewelry - SEO & Marketing Foundation (v1.4)

**Defined:** 2026-02-10
**Core Value:** A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers

## v1 Requirements

Requirements for v1.4 milestone. Each maps to roadmap phases.

### Infrastructure & Foundation

- [ ] **INFRA-01**: Express configured with EJS view engine and layout/partial template system
- [ ] **INFRA-02**: Product slug field added to MongoDB schema with sparse unique index
- [ ] **INFRA-03**: Migration script generates slugs for all existing products from English names
- [ ] **INFRA-04**: Legacy URL redirect middleware returns 301 for all old `.html` paths to new clean URLs
- [ ] **INFRA-05**: Frontend assets (JS/CSS) built by Parcel and served from Express static middleware
- [ ] **INFRA-06**: Deployment merged from two DigitalOcean App Platform components to one unified Express service
- [ ] **INFRA-07**: In-memory SSR page cache with language/currency-aware cache keys
- [ ] **INFRA-08**: Cache invalidation triggers on product create/update/delete and exchange rate updates

### Server-Side Rendering

- [ ] **SSR-01**: Home page rendered server-side with EJS template including full product/content data
- [ ] **SSR-02**: Category pages rendered server-side with pre-populated product grids (names, images, prices, descriptions)
- [ ] **SSR-03**: Individual product detail pages created as new feature with dedicated URL (`/en/product/:slug`)
- [ ] **SSR-04**: Static pages (about, contact, workshop, policies) rendered server-side via EJS
- [ ] **SSR-05**: EJS templates produce identical HTML structure to current client-side JS output (progressive enhancement)
- [ ] **SSR-06**: Client-side JS detects SSR content (`data-ssr` flag) and skips initial re-fetch/re-render
- [ ] **SSR-07**: Cart page rendered server-side (shell only — cart data still from localStorage/API)

### Clean URLs

- [ ] **URL-01**: Category pages accessible at clean paths (`/en/necklaces`, `/he/necklaces` instead of `/html/categories/necklaces.html`)
- [ ] **URL-02**: Product pages accessible at clean paths (`/en/product/:slug`, `/he/product/:slug`)
- [ ] **URL-03**: Static pages accessible at clean paths (`/en/about`, `/he/about` instead of `/html/about.html`)
- [ ] **URL-04**: Home page accessible at language-prefixed paths (`/en`, `/he`)
- [ ] **URL-05**: Language prefix in URL determines page language and direction (no client-side GeoIP detection for SSR pages)
- [ ] **URL-06**: Root `/` redirects to appropriate language based on GeoIP or browser preference

### Bilingual SEO

- [ ] **LANG-01**: All SSR pages served under `/en/` and `/he/` URL prefixes with correct `lang` and `dir` attributes
- [ ] **LANG-02**: Hreflang tags on every page linking English and Hebrew versions (`<link rel="alternate" hreflang="en">`, `<link rel="alternate" hreflang="he">`)
- [ ] **LANG-03**: `x-default` hreflang pointing to English version for non-targeted regions
- [ ] **LANG-04**: Meta descriptions written in both English and Hebrew per page
- [ ] **LANG-05**: SSR renders product names, descriptions, and labels in the correct language based on URL prefix

### Meta Tags & Open Graph

- [ ] **META-01**: Unique `<title>` on every page reflecting page content (e.g., "Handmade Necklaces | Tamar Kfir Jewelry")
- [ ] **META-02**: Unique `<meta description>` on every page (120-160 characters, keyword-optimized)
- [ ] **META-03**: Canonical URL (`<link rel="canonical">`) on every page (self-referencing)
- [ ] **META-04**: Open Graph tags on all pages (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`)
- [ ] **META-05**: Twitter Card tags on all pages (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
- [ ] **META-06**: Product pages include price in Open Graph (`product:price:amount`, `product:price:currency`)
- [ ] **META-07**: Semantic HTML structure: proper `<h1>` on every page, logical heading hierarchy

### Structured Data (JSON-LD)

- [ ] **SCHEMA-01**: Product structured data on product detail pages (name, image, description, sku, offers with price/currency/availability)
- [ ] **SCHEMA-02**: Product structured data on category pages (one Product entry per listed product)
- [ ] **SCHEMA-03**: BreadcrumbList structured data on category and product pages (Home > Category > Product)
- [ ] **SCHEMA-04**: Organization structured data on home page (name, logo, contact, social profiles)
- [ ] **SCHEMA-05**: All structured data validates with Google Rich Results Test (zero errors)

### Sitemap & Crawling

- [ ] **CRAWL-01**: `robots.txt` served at site root with appropriate Allow/Disallow rules
- [ ] **CRAWL-02**: Dynamic XML sitemap generated from MongoDB product data, served at `/sitemap.xml`
- [ ] **CRAWL-03**: Sitemap includes all public pages (home, categories, products, static pages) in both languages
- [ ] **CRAWL-04**: Sitemap includes hreflang alternates for bilingual pages
- [ ] **CRAWL-05**: Image sitemap extension includes product image URLs
- [ ] **CRAWL-06**: Sitemap `lastmod` reflects actual content update times (not build time)
- [ ] **CRAWL-07**: Google Search Console verified and sitemap submitted

### Performance & Validation

- [ ] **PERF-01**: SSR pages serve complete HTML within acceptable TTFB (< 500ms for cached, < 2s uncached)
- [ ] **PERF-02**: HTTP cache headers set appropriately (Cache-Control with stale-while-revalidate)
- [ ] **PERF-03**: Google Fonts loaded with `font-display: swap` to prevent render blocking
- [ ] **PERF-04**: Existing 419 tests continue passing after all SSR changes (zero regression)

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Advanced Bilingual SEO

- **LANG-06**: Bilingual admin interface for entering SEO-specific meta titles and descriptions per product
- **LANG-07**: Hebrew product slug transliteration for truly localized Hebrew URLs

### Marketing Integrations

- **MKT-01**: Google Shopping / Merchant Center product feed
- **MKT-02**: Facebook Pixel integration for conversion tracking
- **MKT-03**: Blog / content marketing system for SEO content

### Advanced SEO

- **SEO-01**: Automated OG image generation (proper 1200x630 crops from product images)
- **SEO-02**: Descriptive image filename pipeline (rename on upload to SEO-friendly names)
- **SEO-03**: Visual regression testing for SSR output

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full framework migration (Next.js/Nuxt) | EJS on Express achieves SSR without rewriting the entire frontend |
| Google Shopping / Merchant Center | Build on top of Product structured data once validated |
| Blog / CMS | Requires content creation commitment; focus on product SEO first |
| AI-generated product descriptions | Handmade jewelry needs authentic artisan descriptions |
| Retroactive image filename optimization | Risks breaking existing CDN URLs; implement for new uploads only |
| Complex analytics setup (GA4, GTM, Facebook Pixel) | Microsoft Clarity already integrated; defer additional analytics |
| Mobile app deep links | Web-first; not relevant for current scale |
| A/B testing infrastructure | Premature; focus on getting baseline SEO right |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 23 | Pending |
| INFRA-02 | Phase 23 | Pending |
| INFRA-03 | Phase 23 | Pending |
| INFRA-04 | Phase 23 | Pending |
| INFRA-05 | Phase 23 | Pending |
| INFRA-06 | Phase 24 | Pending |
| INFRA-07 | Phase 26 | Pending |
| INFRA-08 | Phase 26 | Pending |
| SSR-01 | Phase 24 | Pending |
| SSR-02 | Phase 25 | Pending |
| SSR-03 | Phase 25 | Pending |
| SSR-04 | Phase 24 | Pending |
| SSR-05 | Phase 24 | Pending |
| SSR-06 | Phase 25 | Pending |
| SSR-07 | Phase 25 | Pending |
| URL-01 | Phase 25 | Pending |
| URL-02 | Phase 25 | Pending |
| URL-03 | Phase 24 | Pending |
| URL-04 | Phase 24 | Pending |
| URL-05 | Phase 23 | Pending |
| URL-06 | Phase 23 | Pending |
| LANG-01 | Phase 23 | Pending |
| LANG-02 | Phase 24 | Pending |
| LANG-03 | Phase 24 | Pending |
| LANG-04 | Phase 24 | Pending |
| LANG-05 | Phase 24 | Pending |
| META-01 | Phase 24 | Pending |
| META-02 | Phase 24 | Pending |
| META-03 | Phase 24 | Pending |
| META-04 | Phase 24 | Pending |
| META-05 | Phase 24 | Pending |
| META-06 | Phase 25 | Pending |
| META-07 | Phase 24 | Pending |
| SCHEMA-01 | Phase 25 | Pending |
| SCHEMA-02 | Phase 25 | Pending |
| SCHEMA-03 | Phase 25 | Pending |
| SCHEMA-04 | Phase 24 | Pending |
| SCHEMA-05 | Phase 26 | Pending |
| CRAWL-01 | Phase 23 | Pending |
| CRAWL-02 | Phase 25 | Pending |
| CRAWL-03 | Phase 25 | Pending |
| CRAWL-04 | Phase 25 | Pending |
| CRAWL-05 | Phase 25 | Pending |
| CRAWL-06 | Phase 25 | Pending |
| CRAWL-07 | Phase 26 | Pending |
| PERF-01 | Phase 26 | Pending |
| PERF-02 | Phase 26 | Pending |
| PERF-03 | Phase 26 | Pending |
| PERF-04 | Phase 26 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0
- Phase 23: 9 requirements (INFRA-01..05, URL-05..06, LANG-01, CRAWL-01)
- Phase 24: 17 requirements (INFRA-06, SSR-01/04/05, URL-03..04, LANG-02..05, META-01..05/07, SCHEMA-04)
- Phase 25: 15 requirements (SSR-02/03/06/07, URL-01..02, META-06, SCHEMA-01..03, CRAWL-02..06)
- Phase 26: 8 requirements (INFRA-07..08, SCHEMA-05, CRAWL-07, PERF-01..04)

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after roadmap creation — all 49 requirements mapped to phases*
