# Project Research Summary: SEO & Marketing Foundation (v1.4)

**Project:** Tamar Kfir Jewelry -- SEO & Marketing Foundation
**Domain:** E-commerce SEO for existing vanilla JS multi-page application
**Researched:** 2026-02-10
**Confidence:** HIGH

---

## Critical Corrections to Initial Assumptions

Before anything else, the research phase uncovered five fundamental misunderstandings in the original milestone description. These corrections reshape the entire approach:

1. **NOT a hash-routing SPA.** The app is a multi-page application (MPA) with separate HTML files per page (`necklaces.html`, `about.html`, etc.). Navigation is full page loads via `<a>` tags. There are no hash routes.
2. **The SEO problem is client-side content, not routing.** Product data is fetched via `POST /productsByCategory` and injected into empty `<div class="inner-products-container"></div>` elements by JavaScript. Crawlers see empty containers.
3. **The "clean URL" migration is from file paths, not hashes.** Current URLs are `/html/categories/necklaces.html` -- these need to become `/necklaces`. This is simpler than a hash migration but still requires comprehensive 301 redirects.
4. **Individual product pages do not exist.** Products are displayed in modal overlays on category pages. There is no `/product/gold-necklace` page. Creating these is new feature work, not a migration.
5. **Deployment must merge from two components to one.** The frontend is a static site and the backend is an API service on DigitalOcean App Platform. SSR requires the Express server to serve both HTML pages and API endpoints from a single service.

---

## Executive Summary

The Tamar Kfir Jewelry site is a vanilla JavaScript multi-page application where each page is a separate HTML file enhanced with client-side JS for interactivity. The core SEO problem is that product content -- names, descriptions, prices, images -- lives only in MongoDB and is rendered client-side via `fetch()` calls. Search engine crawlers see empty product containers, making the entire product catalog invisible to Google. The site also lacks robots.txt, XML sitemap, structured data, Open Graph tags, and canonical URLs.

The recommended approach is to add EJS server-side rendering to the existing Express backend. This requires only 2 new npm packages (`ejs` and `sitemap`), no framework migration, and no frontend rewrite. The existing HTML files become EJS templates by renaming the extension and inserting data tags where dynamic content is needed. The Express server gains SSR routes that query MongoDB directly and render complete HTML with product data, meta tags, and JSON-LD structured data pre-populated. The build architecture shifts from two separate deployments (static frontend + API backend) to a single unified Express server that serves everything.

The key risks are: (1) URL migration breaking existing indexed pages and bookmarks if 301 redirects are incomplete, especially payment return URLs hardcoded in the backend; (2) SSR-rendered HTML conflicting with client-side JS that re-renders the DOM on load, causing content flashing; (3) the deployment topology change from two DigitalOcean App Platform components to one. All three are well-mitigated by the phased approach recommended below, where static pages are migrated first as a low-risk proof of concept before tackling the high-value dynamic product pages.

---

## Key Findings

### Recommended Stack

Only 2 new production dependencies are needed. Everything else uses existing Express capabilities or hand-rolled utilities.

**Core technologies:**
- **EJS (^4.0.1):** Server-side template engine -- existing HTML files can be renamed to `.ejs` with zero syntax translation. This is the decisive advantage over Pug, Handlebars, or Nunjucks. Integration is `app.set('view engine', 'ejs')`.
- **sitemap (^9.0.0):** Dynamic XML sitemap generation from MongoDB product data. Stream-based API, handles bilingual `xhtml:link` entries for hreflang. Most popular package (~1.2M weekly downloads).
- **JSON-LD structured data:** No library needed. Plain JavaScript objects serialized as `<script type="application/ld+json">`. The `schema-dts` package is TypeScript-only type definitions with zero runtime value for this plain JS project.
- **Meta tags / Open Graph:** No library needed. EJS partials render `<head>` directly on the server. Libraries like `react-helmet` exist for client-side SPAs where `<head>` cannot be controlled server-side -- not applicable here.
- **Express Router (built-in):** No new routing library. Express `app.get()` handles clean URL routes alongside existing API endpoints.

**What NOT to add:** No meta-frameworks (Next.js, Nuxt, Astro), no prerendering services (Puppeteer, Prerender.io), no client-side meta libraries, no separate URL router packages. See STACK-seo-ssr.md for detailed rationale on each exclusion.

### Expected Features

**Must have (table stakes):**
- TS-1: Unique `<title>` and `<meta description>` on every page
- TS-2: `robots.txt` (does not exist currently)
- TS-3: XML sitemap (does not exist currently)
- TS-4: Open Graph meta tags (none exist -- shared links show no preview)
- TS-5: Twitter Card meta tags
- TS-6: Canonical URLs on all pages
- TS-7: Descriptive image alt text (currently generic or empty)
- TS-8: Semantic HTML structure (homepage missing `<h1>`, about page has empty `<h1>`)
- TS-9: Page load performance basics (Google Fonts without `font-display: swap`)
- TS-10: Correct `<html lang>` and `dir` attributes from server

**Should have (differentiators):**
- D-1: JSON-LD Product structured data (enables Google rich results -- 20-40% higher CTR)
- D-2: BreadcrumbList structured data (improves SERP appearance)
- D-4: Organization schema (enables Knowledge Panel)
- D-5: Image sitemap (jewelry is visual -- Google Images is significant traffic source)
- D-8: Google Search Console setup and sitemap submission

**Defer to future milestones:**
- D-3: Full hreflang with separate language URL paths (`/en/`, `/he/`) -- major routing change
- D-6: Individual product deep-link sharing -- depends on product pages existing
- AF-2: Google Shopping / Merchant Center -- build on D-1 once validated
- AF-6: Blog / content marketing system
- AF-8: Separate language URL paths (long-term correct solution for multilingual SEO)

### Architecture Approach

The architecture follows a "progressive enhancement with unified server" pattern. The Express backend gains an EJS view layer alongside its existing API routes. SEO-critical pages are rendered server-side with product data pre-populated from direct MongoDB queries (not self-calling the API). Client-side JavaScript then enhances the already-rendered page with interactivity (add-to-cart, modals, language switching). The frontend Parcel build produces JS/CSS assets only; HTML generation moves to server-side EJS templates. The deployment merges from two App Platform components into one Express service.

**Major components:**
1. **EJS Template Layer** (`backend/views/`) -- layouts, partials (head, header, footer, product-card, json-ld), and page templates. Must produce the SAME HTML structure as current client-side JS output so progressive enhancement works.
2. **SSR Route Handlers** (`backend/routes/pages.js`) -- Express GET routes for clean URLs (`/necklaces`, `/product/:slug`, `/about`). Query MongoDB directly via a shared `productService.js`, detect locale, render EJS with full product data + meta tags + structured data.
3. **SEO Infrastructure** (`backend/routes/seo.js`) -- sitemap.xml endpoint (dynamic from DB), robots.txt, legacy URL redirect middleware (301 from old `.html` paths to new clean URLs).
4. **SSR Cache Layer** (`backend/middleware/ssrCache.js`) -- In-memory page cache keyed by path + language + currency. Short TTL (5-10 min) for product pages, longer for static pages. Invalidation on product mutations and exchange rate updates.
5. **Product Slug System** (`backend/services/slugService.js`) -- Adds a `slug` field to the Product schema for SEO-friendly URLs. One-time migration for existing products.
6. **Build Pipeline Adaptation** -- Parcel continues building JS/CSS assets; a postbuild script copies them to `backend/public/static/`. EJS templates are NOT processed by Parcel.

### Critical Pitfalls

The top pitfalls, ordered by severity and likelihood:

1. **URL migration breaks indexed pages and payment flows** (CRITICAL) -- Payment return URLs (`cancel_url`, `success_url`) in PayPal/Stripe are hardcoded to `/html/cart.html` and `/index.html` in `backend/index.js`. These MUST be updated simultaneously with URL migration. All old URLs need permanent 301 redirects. Deploy redirects BEFORE removing old patterns.

2. **SSR/client HTML mismatch causes content flashing** (CRITICAL) -- `View.setLanguage()` does `menu.innerHTML = this.handleMenuLanguage(lng)` which nukes and rebuilds the menu regardless of SSR state. `categoriesView` fetches products and re-renders them, destroying SSR content. Prevention: EJS templates must produce identical HTML structure. Add `data-ssr="true"` flags so client JS skips initial re-render.

3. **Redirect loops between old and new URL patterns** (CRITICAL) -- The project already has HTML rewrite middleware concepts. Adding SSR routes creates a second routing layer. If both handle the same URL, infinite loops result. Solution: single source of truth for URL resolution; redirect middleware converts old->new, SSR handles new only.

4. **Language/locale caching serves wrong language** (CRITICAL) -- GeoIP-based locale detection means a Hebrew page could be cached and served to English visitors. Cache keys MUST include language. For this milestone (single URL per language), set `Cache-Control: private` on pages that vary by locale.

5. **Duplicate content at multiple URLs** (CRITICAL) -- Same content at `/html/categories/necklaces.html` and `/necklaces` without canonical tags splits ranking signals. Every page needs exactly ONE canonical URL. Old paths must 301 redirect, never serve content.

6. **JSON-LD structured data validation failures** (HIGH) -- Dual pricing (USD/ILS) means structured data must match displayed price. Image URLs must be absolute (DigitalOcean Spaces CDN). Validate with Google Rich Results Test before launch.

7. **Existing test suite breaks** (HIGH) -- 23 frontend + 26 backend test files built around current MPA architecture. SSR changes to routing, DOM structure, and view initialization cascade into test failures. Run full test suite before starting; make SSR changes additive; update tests in same commit as code changes.

8. **DigitalOcean App Platform SSR configuration** (MODERATE) -- Merging from static site + API service to single service requires config changes. Health checks, memory, route configuration all need attention. Test in staging first.

---

## Implications for Roadmap

Based on combined research, the milestone should be structured in 4 phases with clear dependency ordering.

### Phase 1: Foundation and Infrastructure

**Rationale:** Everything else depends on the Express server being configured for SSR and the URL/redirect infrastructure being in place. This phase has zero user-facing changes and zero SEO risk -- it is pure foundation work.

**Delivers:**
- EJS view engine configured on Express
- Base layout template (head, header, footer partials) extracted from existing HTML
- Product slug field added to schema + migration script run
- Legacy URL redirect middleware (301 from old paths to new)
- `robots.txt` served from Express
- `express.static()` configured for frontend assets
- Route module extraction from monolithic `index.js`

**Addresses:** TS-2 (robots.txt), URL infrastructure for all subsequent features

**Avoids:** Pitfall 1 (broken URLs) by having redirects ready before any URL changes go live; Pitfall 2 (redirect loops) by establishing clear routing order; Pitfall 13 (robots.txt) by getting crawler directives correct from the start

### Phase 2: Static Page SSR + Meta Tags + Structured Data

**Rationale:** Static pages (about, contact, workshop, policies) have no product data dependencies, making them the simplest SSR targets. They validate the entire template pipeline, build process, and deployment merge with minimal risk. Meta tags and structured data for these pages are straightforward.

**Delivers:**
- SSR-rendered static pages (about, contact, workshop, policies, home)
- Unique `<title>`, `<meta description>`, canonical URLs on all pages
- Open Graph + Twitter Card tags on all pages
- Organization schema (JSON-LD on homepage)
- BreadcrumbList schema on category-level pages
- Semantic HTML fixes (homepage `<h1>`, proper heading hierarchy)
- Parcel build pipeline adapted (asset-only output copied to backend)
- Deployment merged to single Express service
- Frontend JS updated with new clean URL links

**Addresses:** TS-1, TS-4, TS-5, TS-6, TS-8, TS-10, D-2, D-4

**Avoids:** Pitfall 3 (hydration) by starting with static pages that have minimal JS interaction; Pitfall 14 (DO App Platform) by validating the deployment merge on simpler pages first; Pitfall 19 (build pipeline) by adapting Parcel before dynamic pages

### Phase 3: Dynamic SSR (Category + Product Pages)

**Rationale:** This is the highest-SEO-value phase. Category pages with pre-rendered product data and individual product detail pages (new feature) are what make the product catalog visible to search engines. This phase depends on the EJS pipeline and deployment being validated in Phase 2.

**Delivers:**
- Category pages SSR-rendered with full product grids (names, images, prices, descriptions)
- Individual product detail pages (NEW -- currently only modals exist)
- Product JSON-LD structured data on category and product pages
- Dynamic XML sitemap generated from MongoDB (includes product URLs)
- Image alt text improvements (composing descriptive alt from product fields)
- Frontend JS adaptation for SSR awareness (`data-ssr` flag, skip initial re-fetch)
- Image sitemap extension

**Addresses:** D-1 (Product structured data), D-5 (Image sitemap), TS-3 (XML sitemap), TS-7 (image alt text), TS-9 (performance -- SSR eliminates client-side double-render)

**Avoids:** Pitfall 3 (hydration) with `data-ssr` flag pattern; Pitfall 7 (JSON-LD validation) by using absolute image URLs and locale-appropriate currency; Pitfall 11 (stale sitemap) by generating dynamically from DB

### Phase 4: Optimization, Caching, and Verification

**Rationale:** Once SSR pages are live, add the performance and monitoring layer. Caching cannot be properly configured until the SSR output is stable. Google Search Console verification depends on sitemap and structured data being in place.

**Delivers:**
- In-memory SSR page cache with language/currency-aware keys
- Cache invalidation on product mutations and exchange rate updates
- HTTP cache headers (Cache-Control, stale-while-revalidate)
- Google Search Console verification and sitemap submission
- Performance quick wins (font-display: swap, preload hints)
- Monitoring: TTFB tracking, cache hit ratios
- Full validation pass with Google Rich Results Test, Lighthouse, URL Inspection

**Addresses:** D-8 (Search Console), TS-9 (performance), caching infrastructure

**Avoids:** Pitfall 5 (wrong language cached) by including language in cache keys; Pitfall 8 (SSR latency) with cache layer; Pitfall 15 (stale data) with mutation-triggered invalidation; Pitfall 9 (OG failures) by validating with Facebook Debugger

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Cannot render EJS pages without the engine configured, cannot migrate URLs without redirects ready, cannot create product URLs without slug system in place.
- **Phase 2 before Phase 3:** Static pages validate the entire SSR pipeline (template rendering, build process, deployment merge, frontend JS compatibility) without the complexity of dynamic product data. If the deployment merge fails, it fails on simple pages, not complex ones.
- **Phase 3 before Phase 4:** Caching requires stable SSR output to cache. Sitemap submission requires product pages to exist. Search Console verification is most valuable after the site has proper structured data.
- **Testing is continuous across all phases** (Pitfall 10): run the full test suite before and after every change, add SSR-specific tests incrementally.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (deployment merge):** The transition from two DigitalOcean App Platform components to one needs staging validation. Build command, routing configuration, and health checks all change.
- **Phase 3 (client-side JS adaptation):** How `categoriesView.js`, `View.js`, and `controller.js` interact with SSR-rendered content requires careful code analysis during planning. The `data-ssr` hydration pattern needs prototyping.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (foundation):** EJS setup, Express routing, slug generation, redirect middleware -- all well-documented.
- **Phase 4 (caching and optimization):** node-cache TTL patterns, HTTP cache headers, Google Search Console setup -- all standard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 2 new packages needed. EJS and sitemap are mature, well-documented, verified against npm registry. No speculative technology choices. |
| Features | HIGH | Feature list verified against Google's official SEO documentation and current codebase state. All "current state" claims confirmed by reading actual HTML/JS files. |
| Architecture | HIGH | Architecture is additive to existing Express app. Progressive enhancement pattern is well-established. Component boundaries are clear. |
| Pitfalls | HIGH | All pitfalls derived from actual codebase analysis (specific line numbers, variable names, function references). Prevention strategies are concrete and actionable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Parcel manifest integration:** How to reference content-hashed JS/CSS filenames in EJS templates. Parcel generates a manifest file, but the exact integration pattern needs validation during Phase 2 implementation.
- **Hebrew product names for slugs:** Products may have Hebrew-only names. The slug system assumes English names exist. Need to verify all products have English names in the database, or design a fallback (e.g., transliteration or ID-based slugs).
- **DigitalOcean App Platform build command:** The merged deployment needs a build command that installs frontend deps, runs Parcel build, copies assets to backend, then starts Express. The exact `build_command` syntax needs testing.
- **Multilingual SEO strategy (deferred):** Full hreflang with separate language URL paths is explicitly deferred. This means Hebrew content remains invisible to Google for this milestone. This is an acceptable trade-off -- the English catalog is the priority -- but should be planned as the next SEO milestone.
- **OG image dimensions:** Product images are jewelry photos unlikely to be 1200x630px. Generating OG-specific crops may require adding a Sharp processing step during image upload. This could be deferred to Phase 4 or a subsequent milestone, using default brand images initially.

---

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `controller.js`, `View.js`, `categoriesView.js`, `locale.js`, `backend/index.js`, `backend/config/locale.js`, `Product.js` schema, all HTML templates, test files, deployment configuration
- [Google Product Structured Data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google Managing Multi-Regional Sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google Structured Data Overview](https://developers.google.com/search/docs/appearance/structured-data)
- [Google Site Moves with URL Changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google Build and Submit a Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [EJS Official Documentation](https://ejs.co/)
- [Express Template Engine Guide](https://expressjs.com/en/guide/using-template-engines.html)
- npm registry -- version verification for EJS (4.0.1), sitemap (9.0.0)

### Secondary (MEDIUM confidence)
- [Weglot Hreflang Guide](https://www.weglot.com/guides/hreflang-tag)
- [ResultFirst E-commerce Schema Markups 2026](https://www.resultfirst.com/blog/ecommerce-seo/ecommerce-schema-markups/)
- [Koanthic E-commerce Schema Guide](https://koanthic.com/en/e-commerce-schema-markup-complete-guide-examples-2026/)
- [Scale Delight Jewelry SEO Strategies](https://scaledelight.com/blogs/jewelry-ecommerce-websites/)
- [DigitalOcean EJS Tutorial](https://www.digitalocean.com/community/tutorials/how-to-use-ejs-to-template-your-node-application)
- [Semrush Canonical URL Guide](https://www.semrush.com/blog/canonical-url-guide/)

### Tertiary (LOW confidence)
- SSR performance benchmarks (Medium articles) -- numbers vary widely, used directionally only
- PixelFreeStudio SSR caching patterns -- concepts verified against Node.js documentation

---

*Research completed: 2026-02-10*
*Ready for roadmap: yes*
