# Feature Landscape: SEO & Marketing Foundation

**Domain:** E-commerce SEO for handmade jewelry store (Tamar Kfir Jewelry)
**Researched:** 2026-02-10
**Overall Confidence:** HIGH (verified against Google official documentation and multiple authoritative sources)

---

## Critical Architecture Constraint

**This site is a multi-page SPA hybrid.** Each page (home, categories, about, etc.) is a separate HTML file, but product content within category pages is loaded dynamically via JavaScript `fetch()` calls to the backend API. This means:

- **Category pages ship empty** -- the `<div class="inner-products-container"></div>` is populated by JS after page load
- **No individual product pages exist** -- products are shown in modal overlays on category pages
- **Structured data cannot be generated client-side** -- Google requires Product schema to be in the initial HTML response
- **No robots.txt or sitemap exists** currently
- **Meta tags are static per HTML file** -- only the homepage and category pages have basic `<meta description>` tags
- **No Open Graph or Twitter Card tags exist** on any page
- **No structured data (JSON-LD) exists** anywhere

This architecture creates a fundamental tension: the site needs server-generated content for SEO, but currently relies entirely on client-side rendering for product data. Every feature below must be evaluated against this constraint.

---

## Table Stakes

Features users and search engines expect. Missing = invisible to search engines and social platforms.

### TS-1: Basic Meta Tags on All Pages

| Aspect | Detail |
|--------|--------|
| **What** | Unique `<title>`, `<meta description>` for every page |
| **Why Expected** | Google uses these for SERP display; missing = auto-generated snippets |
| **Current State** | Homepage and category pages have basic titles/descriptions. Other pages (about, workshop, contact, policies) have varying quality descriptions |
| **Complexity** | Low |
| **Dependencies** | None -- pure HTML edits |
| **Jewelry-Specific** | Titles should include jewelry type + "handmade" + brand. Example: "Handmade Crochet Necklaces | Tamar Kfir Jewelry" |

**Confidence:** HIGH -- verified directly from existing HTML files.

### TS-2: robots.txt

| Aspect | Detail |
|--------|--------|
| **What** | A `robots.txt` file at site root controlling crawler access |
| **Why Expected** | Every production website needs this. Without it, crawlers may index admin pages, cart pages, API endpoints |
| **Current State** | Does not exist |
| **Complexity** | Low |
| **Dependencies** | Understanding of which paths should be blocked (admin, cart, API) |
| **Content** | Allow crawling of all public pages, block `/html/cart.html`, block admin routes, reference sitemap location |

**Confidence:** HIGH -- confirmed no robots.txt exists via file search.

### TS-3: XML Sitemap (Pages)

| Aspect | Detail |
|--------|--------|
| **What** | XML sitemap listing all public pages with `<lastmod>` timestamps |
| **Why Expected** | Google Search Console requires it; helps discovery of all pages |
| **Current State** | Does not exist |
| **Complexity** | Low-Medium |
| **Dependencies** | Need to decide: static file or server-generated endpoint |
| **Pages to Include** | Homepage, all category pages (necklaces, crochetNecklaces, hoops, dangle), about, workshop, contact, policies |
| **Pages to Exclude** | Cart, admin pages, template files (categoriesTemplate.html) |

**Confidence:** HIGH -- confirmed no sitemap exists via file search.

### TS-4: Open Graph Meta Tags

| Aspect | Detail |
|--------|--------|
| **What** | `og:title`, `og:description`, `og:image`, `og:url`, `og:type` on every page |
| **Why Expected** | When anyone shares a link on Facebook, WhatsApp, Instagram, LinkedIn -- the preview card is generated from OG tags. Without them, shares show a blank or random image |
| **Current State** | No OG tags on any page |
| **Complexity** | Low for static pages; Medium for dynamic product sharing |
| **Dependencies** | Need a designated OG image per page (or a default brand image) |
| **Jewelry-Specific** | Product images are the primary selling point. OG images should be high-quality product photos, ideally 1200x630px. For category pages, use the hero/category banner image |

**Confidence:** HIGH -- verified by reading all HTML files, no OG tags present.

### TS-5: Twitter Card Meta Tags

| Aspect | Detail |
|--------|--------|
| **What** | `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` |
| **Why Expected** | Twitter/X uses these for link previews; falls back to OG tags but dedicated tags give better control |
| **Current State** | No Twitter card tags exist |
| **Complexity** | Low (can share values with OG tags) |
| **Dependencies** | Same images as OG tags |
| **Recommendation** | Use `twitter:card = summary_large_image` for jewelry -- visual impact matters |

**Confidence:** HIGH.

### TS-6: Canonical URLs

| Aspect | Detail |
|--------|--------|
| **What** | `<link rel="canonical" href="...">` on every page |
| **Why Expected** | Prevents duplicate content issues. Essential for the dual-language setup where the same URL serves English and Hebrew content |
| **Current State** | No canonical tags exist |
| **Complexity** | Low |
| **Dependencies** | Need to decide canonical URL strategy for multilingual content |
| **Critical Note** | Since both languages are served from the same URL via client-side JS switching, canonical should point to self. If separate URLs per language are created later, canonical strategy must change |

**Confidence:** HIGH.

### TS-7: Image Alt Text Improvements

| Aspect | Detail |
|--------|--------|
| **What** | Descriptive, keyword-rich alt text on all product and content images |
| **Why Expected** | Accessibility requirement (WCAG); Google Images ranking signal; screen reader support |
| **Current State** | Mixed. Category hero images have basic alt text ("Crochet Necklaces main category image"). Many images have empty `alt=""` or generic text. Product images rendered by JS use only the product `name` field as alt text |
| **Complexity** | Low for static images; Medium for dynamic product images (requires improved alt text composition from existing product fields) |
| **Dependencies** | Product model already has `name`, `category`, and `description` fields that can compose better alt text |
| **Jewelry-Specific** | Alt text should describe material, color, jewelry type. Example: "Gold-plated crochet necklace with turquoise beads - handmade by Tamar Kfir" rather than just the product name |

**Confidence:** HIGH -- verified from HTML source and categoriesView.js markup generation (line 1329: `alt="${name}"`).

### TS-8: Semantic HTML Structure

| Aspect | Detail |
|--------|--------|
| **What** | Proper heading hierarchy (h1, h2, h3), semantic landmarks, meaningful link text |
| **Why Expected** | Search engines use heading structure to understand content hierarchy; affects accessibility |
| **Current State** | Category pages have proper `<h1>` for category title. Homepage lacks a visible `<h1>` (only has tagline text in a `<p>` tag). About page has empty `<h1 id="page-title">` (populated by JS). Several images use empty `alt=""` |
| **Complexity** | Low |
| **Dependencies** | None |

**Confidence:** HIGH -- verified from HTML files.

### TS-9: Page Load Performance Basics

| Aspect | Detail |
|--------|--------|
| **What** | Core Web Vitals: LCP, FID/INP, CLS within acceptable ranges |
| **Why Expected** | Google ranking signal since 2021; affects both SEO and user experience |
| **Current State** | Images use `loading="lazy"` and `fetchpriority="high"` on hero. However, multiple Google Fonts are loaded (Raleway, Amatic SC, Poiret One, Great Vibes, Montserrat, Rubik) without `font-display: swap`. No preload hints for critical resources |
| **Complexity** | Medium |
| **Dependencies** | Performance audit needed |
| **Quick Wins** | Add `font-display: swap` to Google Fonts URLs, preload critical CSS, reduce number of font families loaded per page |

**Confidence:** MEDIUM -- performance specifics need runtime measurement.

### TS-10: Basic Multilingual SEO Signals

| Aspect | Detail |
|--------|--------|
| **What** | `<html lang="en">` / `<html lang="he">` attribute set correctly; `dir="rtl"` for Hebrew |
| **Why Expected** | Search engines use the `lang` attribute to understand page language |
| **Current State** | Partially implemented. The `locale.js` sets `document.documentElement.lang` and `dir` attributes dynamically based on user preference. However, this is **client-side only** -- the initial HTML always has `lang="en"`. Googlebot sees only `lang="en"` |
| **Complexity** | Low for the attribute itself; HIGH for proper multilingual SEO (see Differentiator D-3) |
| **Dependencies** | Fundamental architectural decision about how to handle two languages for SEO |

**Confidence:** HIGH -- verified from HTML source and locale.js.

---

## Differentiators

Features that set the store apart in search results. Not strictly required, but provide competitive advantage for a handmade jewelry store.

### D-1: JSON-LD Product Structured Data

| Aspect | Detail |
|--------|--------|
| **What** | schema.org Product markup in JSON-LD format enabling Google rich results |
| **Why Valuable** | Enables rich results in Google (price, availability, images directly in SERP). Pages with Product schema achieve 20-40% higher click-through rates |
| **Complexity** | HIGH |
| **Why High Complexity** | Products are loaded dynamically via JS `fetch()` to `${this.apiUrl}/productsByCategory`. Google requires structured data in the initial HTML response -- it cannot be generated by JavaScript after page load. This means structured data must come from the server side |
| **Required Properties** | `name`, `image`, `description`, `sku`, `offers` (with `price`, `priceCurrency`, `availability`, `url`) |
| **Available Data** | Product model has: `name`, `description`, `images` (with CDN URLs), `sku`, `usd_price`, `ils_price`, `quantity` (for availability), `category`. All required properties exist in the database |
| **Implementation Options** | (a) Backend API endpoint that returns JSON-LD `<script>` blocks for category pages, injected by a build step; (b) Server-side middleware that injects JSON-LD into HTML before serving; (c) Dynamic rendering service (e.g., Prerender.io) that pre-renders pages for crawlers; (d) Generate static JSON-LD files per category at build time |
| **Jewelry-Specific Properties** | `material`, `color`, `brand` (always "Tamar Kfir Jewelry"), `category`, `itemCondition` (always "https://schema.org/NewCondition") |

**Confidence:** HIGH -- Google's documentation explicitly states structured data must be in initial HTML. Product model verified to have all required fields.

### D-2: BreadcrumbList Structured Data

| Aspect | Detail |
|--------|--------|
| **What** | schema.org BreadcrumbList showing navigation path: Home > Category |
| **Why Valuable** | Google shows breadcrumbs in search results instead of raw URLs. Improves SERP appearance for category pages |
| **Complexity** | Low-Medium |
| **Dependencies** | Works without individual product pages. Shows "Home > Necklaces" for category pages |
| **Implementation** | JSON-LD in the `<head>` of each category page. Can be hardcoded since category structure is static (4 active categories: necklaces, crochet necklaces, hoops, dangle) |

**Confidence:** HIGH.

### D-3: Proper Hreflang Implementation

| Aspect | Detail |
|--------|--------|
| **What** | hreflang tags telling Google which language version to show to which audience |
| **Why Valuable** | Prevents Google from treating English and Hebrew content as duplicates; ensures Israeli users see Hebrew SERP listing and international users see English |
| **Complexity** | HIGH |
| **Why High Complexity** | The current architecture serves both languages from the same URL via client-side JS. Proper hreflang requires separate URLs per language version. Options: (a) Subdirectory approach: `/en/necklaces` and `/he/necklaces`; (b) Query parameter: `?lang=en` and `?lang=he`; (c) Subdomain: `en.site.com` and `he.site.com`. Each requires server-side routing, content detection, and URL generation changes |
| **Critical Issue** | Without separate URLs, Google only indexes one language version (whichever it sees in the initial HTML, which is English). The entire Hebrew version is invisible to Google |
| **Recommendation** | Defer full hreflang to a future milestone. For this milestone, ensure English content is well-optimized and add the `x-default` hreflang pointing to the current URL. Full multilingual SEO is a significant architectural change requiring separate URL paths per language |

**Confidence:** HIGH -- hreflang requirements verified against multiple authoritative sources.

### D-4: Organization Schema

| Aspect | Detail |
|--------|--------|
| **What** | schema.org Organization markup for the brand (name, logo, social profiles, contact info) |
| **Why Valuable** | Enables Knowledge Panel in Google; establishes brand identity in search results |
| **Complexity** | Low |
| **Dependencies** | Need: brand name, logo URL, social media profile URLs, contact information |
| **Implementation** | Single JSON-LD block on homepage |
| **Available Data** | Brand name ("Tamar Kfir Jewelry"), logo (arvin-logo.webp at frontend root), WhatsApp link (wa.me/972524484763), contact page exists |

**Confidence:** HIGH.

### D-5: Image Sitemap

| Aspect | Detail |
|--------|--------|
| **What** | XML sitemap extension including product image URLs with captions and titles |
| **Why Valuable** | Helps Google Images discover and index product photos. For a visual product like jewelry, Google Images is a significant traffic source |
| **Complexity** | Medium |
| **Dependencies** | Requires access to product image URLs from the database. Must be generated server-side since image URLs are stored in MongoDB |
| **Image Data Available** | Product model has `images` array with `publicDesktop`, `publicMobile`, `desktop`, `mobile` variants. CDN URLs from DigitalOcean Spaces |
| **Jewelry-Specific** | Jewelry shoppers frequently use Google Images to discover products. Image sitemap inclusion significantly improves image search visibility |

**Confidence:** MEDIUM -- image URLs are in the database; implementation depends on backend endpoint creation.

### D-6: Dynamic Product Sharing (Deep Links)

| Aspect | Detail |
|--------|--------|
| **What** | Ability to share a link to a specific product that shows the right OG preview (product image, name, price) |
| **Why Valuable** | When a customer shares a specific necklace on WhatsApp or Instagram, the preview should show that necklace -- not a generic category image |
| **Complexity** | HIGH |
| **Why High Complexity** | Currently no individual product URLs exist. Products are shown in modals on category pages. To share a specific product requires: (a) A URL scheme for individual products (e.g., `/products/SKU123` or `?product=123`); (b) Server-side or pre-rendered HTML for that URL with correct OG tags; (c) The shared page must either show the product directly or redirect to the category page with the modal open |
| **Recommendation** | Start with category-level sharing (share the necklaces page, not a specific necklace). Individual product sharing requires either individual product pages or server-side rendering |

**Confidence:** HIGH -- architectural constraint verified from code review.

### D-7: Descriptive Image Filenames

| Aspect | Detail |
|--------|--------|
| **What** | Rename product image files from generic names to descriptive, SEO-friendly names |
| **Why Valuable** | Google uses filenames as ranking signals for Google Images. "handmade-gold-crochet-necklace.webp" ranks better than "IMG_5418.jpeg" |
| **Current State** | Mixed. Some images have descriptive names ("Crochet-Hero.webp", "Hoop-Hero.webp"), others are generic ("IMG_5418 (Medium).jpeg", "hero-test2.webp"). Product images uploaded via admin may have auto-generated or original camera names |
| **Complexity** | Medium (requires image renaming pipeline during upload; retroactive renaming affects CDN URLs and database references) |
| **Dependencies** | Admin upload process, DigitalOcean Spaces CDN URLs, Product model image references |
| **Recommendation** | Implement for new uploads going forward; defer retroactive renaming to avoid breaking existing URLs |

**Confidence:** HIGH -- verified image filenames from HTML source.

### D-8: Google Search Console Setup

| Aspect | Detail |
|--------|--------|
| **What** | Verify site ownership in Google Search Console, submit sitemap, monitor indexing |
| **Why Valuable** | Essential tool for monitoring SEO health, identifying crawl errors, submitting sitemaps, seeing what queries bring traffic |
| **Complexity** | Low |
| **Dependencies** | Requires DNS or meta tag verification. Sitemap (TS-3) should be ready to submit |
| **Implementation** | Add verification meta tag to homepage, submit sitemap URL, configure settings |

**Confidence:** HIGH.

---

## Anti-Features

Features to explicitly NOT build in this milestone. Common mistakes in this domain.

### AF-1: Full Server-Side Rendering (SSR) Migration

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | Migrating the entire frontend to Next.js, Nuxt, or similar SSR framework would solve all SEO rendering problems but would be a complete rewrite of the frontend. The current architecture works well for users; SEO improvements can be achieved with targeted solutions (pre-rendering, server-generated JSON-LD, static meta tags) |
| **What to Do Instead** | Use targeted pre-rendering or dynamic rendering for SEO-critical pages while keeping the existing multi-page SPA architecture |

### AF-2: Google Shopping / Merchant Center Integration

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | Requires product feed in specific format (XML/CSV with id, title, description, link, image_link, price, availability, condition, brand), material attributes for jewelry category, ongoing feed maintenance. The store has ~94 products -- the setup and maintenance overhead is not justified until organic SEO is working |
| **What to Do Instead** | Focus on organic SEO first. Revisit Merchant Center once Product structured data (D-1) is implemented and validated. Note: handmade products are exempt from GTIN requirement (set `identifier_exists` to `FALSE`) |
| **Defer Until** | After Product structured data is implemented and validated in Google Rich Results Test |

### AF-3: Individual Product Pages

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | Creating ~94 individual product pages (each with unique URL, meta tags, structured data) would be ideal for SEO but represents a major architectural change. Would require: URL routing, page template system, server-side or build-time page generation, URL management, and potentially a sitemap that updates with every product change |
| **What to Do Instead** | Maximize category page SEO. Add structured data for products via server-side injection into category pages. Consider individual product pages as a future milestone |
| **Exception** | If dynamic rendering / pre-rendering is implemented for D-1, product-specific URLs could become a natural extension |

### AF-4: Automated SEO Content Generation (AI-written descriptions)

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | AI-generated product descriptions are generic and may not capture the unique artisan story of handmade jewelry. Google's helpful content guidelines penalize low-quality automated content. For ~94 products, hand-written descriptions are feasible and more authentic |
| **What to Do Instead** | Ensure existing product descriptions are complete in both languages. Provide a template/guide for writing SEO-friendly product descriptions that include materials, dimensions, craftsmanship details |

### AF-5: Complex Analytics/Tracking Setup (GA4, GTM, Facebook Pixel)

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | Microsoft Clarity is already integrated. Adding Google Analytics 4, Google Tag Manager, Facebook Pixel, etc. in this milestone would dilute focus from core SEO work |
| **What to Do Instead** | Set up Google Search Console (D-8, essential for SEO monitoring). Defer additional analytics to a separate milestone |

### AF-6: Blog / Content Marketing System

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | A blog is valuable for SEO long-term (keyword targeting, internal linking, freshness signals) but requires ongoing content creation commitment and CMS infrastructure. Building this doesn't address the current fundamental SEO gaps |
| **What to Do Instead** | Focus on optimizing existing pages first. A blog can be a future milestone once the technical SEO foundation is solid |

### AF-7: Aggressive URL Restructuring

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | Changing URLs (e.g., from `/html/categories/necklaces.html` to `/shop/necklaces/`) would require 301 redirects for any already-indexed pages, risk breaking existing bookmarks and external links, and add complexity |
| **What to Do Instead** | Keep current URL structure. Focus on content optimization within existing URLs. URL restructuring can be part of a larger architectural milestone if needed |

### AF-8: Separate Language URL Paths (This Milestone)

| Aspect | Detail |
|--------|--------|
| **Why Avoid** | Creating `/en/` and `/he/` URL paths would require major routing changes, server-side language detection, and duplication of all HTML files or dynamic serving. This is the right long-term solution but is too large for an SEO foundation milestone |
| **What to Do Instead** | Optimize English content thoroughly (Google's primary crawl). Add `x-default` hreflang. Plan separate language URLs as a dedicated future milestone |

---

## Feature Dependencies

```
robots.txt (TS-2) ── no dependencies
    |
    v
XML Sitemap (TS-3) ── robots.txt references sitemap URL
    |
    v
Google Search Console (D-8) ── requires sitemap + robots.txt + verification tag

Meta Tags (TS-1) ── no dependencies
    |
    +-- OG Tags (TS-4) ── requires OG images
    |
    +-- Twitter Cards (TS-5) ── shares data with OG tags
    |
    +-- Canonical URLs (TS-6) ── informs OG/hreflang strategy

Semantic HTML (TS-8) ── no dependencies

Image Alt Text (TS-7) ── no dependencies for static images
                         product images: compose from name + category fields

Organization Schema (D-4) ── no dependencies, low effort
    |
    v
BreadcrumbList Schema (D-2) ── low effort, enhances SERP
    |
    v
Product Schema (D-1) ── HIGH effort, requires server-side solution
    |                     depends on: product data model, server architecture
    |
    +-- Image Sitemap (D-5) ── requires same server-side product data access
    |
    +-- Product Sharing (D-6) ── requires product URLs + server-side OG
    |
    +-- Google Merchant Center (AF-2) ── DEFERRED, uses same data as D-1

Hreflang (D-3) ── DEFERRED, requires separate URL paths (AF-8)
```

---

## MVP Recommendation

For the SEO & Marketing Foundation milestone, prioritize in this order:

### Phase 1: Quick HTML Improvements (No server changes needed)

1. **robots.txt** (TS-2) -- ~30 minutes, immediate crawler guidance
2. **Meta tags audit and improvement** (TS-1) -- 2-3 hours, all pages
3. **Canonical URLs** (TS-6) -- 1 hour, all pages
4. **Open Graph tags** (TS-4) -- 2-3 hours, all pages with designated OG images
5. **Twitter Card tags** (TS-5) -- 30 minutes (shares OG tag values)
6. **Semantic HTML fixes** (TS-8) -- 1-2 hours (homepage h1, about page h1, alt texts)
7. **Static image alt text improvement** (TS-7, static images only) -- 1-2 hours

### Phase 2: Lightweight Server/Build Additions

8. **XML Sitemap** (TS-3) -- static file or simple backend endpoint
9. **Organization Schema** (D-4) -- JSON-LD block on homepage
10. **BreadcrumbList Schema** (D-2) -- JSON-LD blocks on category pages
11. **Google Search Console setup** (D-8) -- verify, submit sitemap
12. **Dynamic image alt text** (TS-7, product images) -- improve alt text composition in categoriesView.js

### Phase 3: High-Impact, High-Effort (May carry into future milestone)

13. **Product structured data solution** (D-1) -- requires architectural decision about server-side JSON-LD injection
14. **Image sitemap** (D-5) -- backend endpoint querying product image data
15. **Page performance quick wins** (TS-9) -- font-display: swap, preload hints

### Defer to Future Milestones

- Full hreflang with separate language URLs (D-3 + AF-8) -- dedicated multilingual milestone
- Individual product pages (AF-3) -- major architectural change
- Google Merchant Center feed (AF-2) -- build on top of D-1
- Product deep-link sharing (D-6) -- requires product page URLs
- Retroactive image filename optimization (D-7) -- risks breaking CDN URLs

---

## Jewelry-Specific SEO Considerations

### Visual Search is Critical
Jewelry is an inherently visual product. Google Images and Pinterest are significant discovery channels. Image optimization (alt text, image sitemaps, descriptive filenames, proper sizing) has outsized ROI for jewelry compared to other e-commerce categories.

### "Handmade" is a Keyword Advantage
The term "handmade" is both a differentiator and a high-value search term. Every title and description should naturally incorporate "handmade" where appropriate. This keyword also exempts products from GTIN requirements in Google Shopping.

### Material and Style Keywords
Jewelry shoppers search by material ("gold necklace", "silver earrings"), technique ("crochet necklace"), and occasion ("gift for her", "wedding jewelry"). Meta descriptions and product descriptions should target these terms naturally.

### Local SEO (Jerusalem/Israel)
The artisan is based in Jerusalem. For Israeli customers searching in Hebrew, local SEO signals matter. The brand story is a differentiator: "handmade in Jerusalem" has both SEO and emotional value. Consider mentioning location in Organization schema and meta descriptions.

### Price Display in Rich Results
When Product schema shows price in SERP, it can work for or against handmade jewelry. Handmade pieces are typically premium-priced compared to mass-produced alternatives. Showing price upfront filters out price-sensitive shoppers, which can actually improve conversion rate for those who do click through. Include price in structured data but emphasize craftsmanship and uniqueness in descriptions.

### Dual Currency Consideration
Products have both USD and ILS prices. For structured data, use `priceCurrency: "USD"` for the English version (broader international reach) and plan for `priceCurrency: "ILS"` when Hebrew-specific pages are created. Google supports multiple Offer objects with different currencies.

---

## Sources

- Google Product Structured Data: [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/product)
- Google E-commerce Structured Data: [Google Search Central](https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce)
- Google Merchant Listing: [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- E-commerce Schema Markups 2026: [ResultFirst](https://www.resultfirst.com/blog/ecommerce-seo/ecommerce-schema-markups/)
- E-commerce Schema Complete Guide: [Koanthic](https://koanthic.com/en/e-commerce-schema-markup-complete-guide-examples-2026/)
- Hreflang Implementation: [Weglot Guide](https://www.weglot.com/guides/hreflang-tag), [Backlinko](https://backlinko.com/hreflang-tag)
- Hreflang + Canonical: [Portent](https://portent.com/blog/seo/implement-hreflang-canonical-tags-correctly.htm)
- Image SEO Best Practices: [Google Search Central](https://developers.google.com/search/docs/appearance/google-images)
- Image SEO Alt Tags 2026: [Solomo Media](https://solomomedia.com/alt-tags-image-seo-2026/)
- XML Sitemap Best Practices: [Digital Chakra](https://digitalchakra.co.uk/blog/detailed-guide-to-ecommerce-sitemap/)
- E-commerce Sitemap Best Practices: [ResultFirst](https://www.resultfirst.com/blog/ecommerce-seo/ecommerce-sitemap-best-practices/)
- SPA SEO Guide 2026: [Jesper SEO](https://jesperseo.com/blog/seo-for-single-page-applications-complete-2026-guide/)
- Dynamic Rendering / Pre-rendering: [Prerender.io](https://prerender.io)
- Open Graph Best Practices: [Digital Ink](https://www.digital.ink/blog/open-graph-image/)
- Google Shopping Feed Spec: [Google Merchant Center](https://support.google.com/merchants/answer/7052112?hl=en)
- Google Shopping Material Attribute: [Google Merchant Center](https://support.google.com/merchants/answer/6324410?hl=en)
- Jewelry SEO Strategies: [Scale Delight](https://scaledelight.com/blogs/jewelry-ecommerce-websites/), [TransPacific](https://www.transpacific-software.com/Jewelry-website-SEO-advance-techniques.html)
- Structured Data for SEO 2026: [ALM Corp](https://almcorp.com/blog/schema-markup-detailed-guide-2026-serp-visibility/)

---

*Feature research for: SEO & Marketing Foundation milestone*
*Project: Tamar Kfir Jewelry E-commerce*
*Researched: 2026-02-10*
