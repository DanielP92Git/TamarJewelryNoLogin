# Phase 23: Foundation & Infrastructure - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Express server configured for SSR with EJS templates, product slugs exist for URL generation, bilingual URL routing is operational with /en and /he prefixes, legacy .html paths redirect correctly to new clean URLs, and crawlers receive proper directives via robots.txt. This phase delivers the infrastructure that Phases 24-26 build on.

</domain>

<decisions>
## Implementation Decisions

### Slug generation
- Claude's discretion on slug source (English-only vs per-language), duplicate handling strategy, immutability policy, separator/length, and whether admin can manually edit slugs
- Claude's discretion on category slug approach (investigate codebase for existing category name patterns)
- Migration script should auto-generate slugs for all existing products (Claude decides approach)
- Migration must be idempotent (re-runnable safely) per success criteria

### Language detection & redirects
- Root URL (/) redirect: Claude's discretion on detection priority (GeoIP vs Accept-Language), using existing locale detection patterns in codebase
- **Language preference cookie:** Yes — set a cookie on first visit or language switch so returning visitors go straight to their language
- **Cookie stores both language AND currency:** Returning visitors get their exact previous combination
- **Currency auto-links to language by default:** Hebrew = ILS, English = USD. But manual currency override is sticky within and across sessions (stored in cookie)
- **Invalid language prefix (e.g., /fr/about):** Redirect to /en equivalent
- Language switcher behavior (server navigation vs client-side): Claude's discretion based on SSR architecture needs

### URL structure & legacy mapping
- Claude discovers all old .html paths from the codebase and proposes the mapping to new clean URLs
- Category URL language (English for both vs translated): Claude's discretion based on SEO best practices
- Dead/unmatched old URLs: Claude's discretion (404 vs redirect)
- Hash-based routes: Claude investigates current routing pattern and decides whether redirect rules are needed

### Robots.txt rules
- **Block admin paths:** Disallow /admin/ and related paths
- **Block API routes:** Disallow /api/*
- **Block AI training bots:** Disallow GPTBot, CCBot, Google-Extended, and similar AI training crawlers
- Sitemap reference: Claude's discretion on whether to include now or wait for Phase 25

### Claude's Discretion
- Slug generation approach (source language, duplicates, immutability, format, admin editability, category slugs)
- Language detection priority order
- Language switcher implementation (server nav vs client-side)
- Category URL translation strategy
- Dead URL handling
- Hash route redirect rules
- Sitemap reference timing in robots.txt
- EJS template engine configuration details
- All technical architecture decisions

</decisions>

<specifics>
## Specific Ideas

- Currency and language should feel linked but not locked — auto-default currency from language, but respect manual overrides across the session
- Cookie should remember both preferences so returning visitors get a seamless experience
- AI training bots should be explicitly blocked — the product images and descriptions are original creative work

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-foundation-infrastructure*
*Context gathered: 2026-02-10*
