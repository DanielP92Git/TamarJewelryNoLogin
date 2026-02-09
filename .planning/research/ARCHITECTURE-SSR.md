# Architecture: SSR & Clean URLs Integration

**Domain:** SEO & Server-Side Rendering for Existing Vanilla JS E-commerce SPA
**Researched:** 2026-02-10
**Overall Confidence:** HIGH (based on codebase analysis + verified patterns)

---

## 1. Current Architecture Analysis

### What Exists Today

```
CURRENT DEPLOYMENT MODEL
=========================

DigitalOcean App Platform
  |
  +-- Static Site (frontend/dist/)    <-- Parcel-built HTML/JS/CSS
  |     - index.html (home)
  |     - html/categories/necklaces.html
  |     - html/categories/hoops.html
  |     - html/about.html
  |     - html/cart.html
  |     - html/contact-me.html
  |     - html/policies.html
  |     - html/jewelry-workshop.html
  |     - js/*.js (bundled by Parcel)
  |     - css/*.css
  |
  +-- Web Service (backend/)          <-- Express API on port 4000
        - /allproducts
        - /productsByCategory
        - /getproduct/:id
        - /getcart, /addtocart, /removefromcart
        - /orders, /orders/:id/capture
        - /create-checkout-session
        - /api/locale
        - /health
        - /uploads/*, /smallImages/* (image serving)
```

### Key Architectural Facts (from code analysis)

1. **No SPA router.** The app does NOT use hash-based client-side routing. Each page is a separate HTML file (`index.html`, `necklaces.html`, `cart.html`, etc.). Navigation is full page loads via `<a href="/html/categories/necklaces.html">`.

2. **Page detection via body ID.** The controller.js uses `document.body.id` to determine which page it is on (`home`, `categories`, `cart`, `workshop`, `about`, `contact-me`, `policies`). Each page triggers a different control function.

3. **Category pages are semi-dynamic.** The HTML files are static shells with body attributes (`class="necklaces"`, `data-hebrew="..."`, `data-category="necklaces"`). JavaScript fetches products from the API and renders them into `.inner-products-container`.

4. **Product data is API-fetched.** Categories pages call `POST /productsByCategory` with `{ category, page }` to get products. Products are rendered entirely via JS (`getProductMarkup()`). The initial HTML has NO product content -- just empty containers.

5. **No product detail pages exist.** Products open in a modal overlay (`generatePreview()`), not separate URLs. There is no `/product/gold-charm-bracelet` page.

6. **Frontend and backend are separate deployments.** The frontend is a Parcel static build. The backend is a standalone Express API. They communicate via API calls (`this.apiUrl`).

7. **Multi-page app (MPA) with JS enhancement.** Despite being called an "SPA", this is actually an MPA where each page is a separate HTML file, enhanced with JavaScript for interactivity (menus, modals, cart, language switching).

### Correction to Milestone Context

The milestone context states "Hash-based (#/category/bracelets, #/product/123)" routing. **This is incorrect based on code analysis.** The actual routing is file-based (`/html/categories/necklaces.html`). There are no hash routes. The current URLs are:

| Current URL | Page |
|---|---|
| `/index.html` | Home |
| `/html/categories/necklaces.html` | Necklaces category |
| `/html/categories/crochetNecklaces.html` | Crochet Necklaces |
| `/html/categories/hoops.html` | Hoop Earrings |
| `/html/categories/dangle.html` | Dangle Earrings |
| `/html/about.html` | About |
| `/html/contact-me.html` | Contact |
| `/html/cart.html` | Cart |
| `/html/jewelry-workshop.html` | Workshop |
| `/html/policies.html` | Policies |

This is GOOD NEWS for SEO -- there is no hash routing migration needed. The URLs are already crawlable. The SEO work is about:
1. Making URLs cleaner (drop `.html`, flatten `/html/categories/`)
2. Pre-populating product content in HTML (currently empty containers)
3. Adding structured data (JSON-LD) and meta tags
4. Creating individual product detail pages (currently modals only)

---

## 2. SSR Strategy Recommendation

### Options Evaluated

| Strategy | Description | Fits This App? |
|---|---|---|
| **A. EJS templates on Express** | Express renders full HTML with product data from DB | YES -- Best fit |
| **B. Prerendering service (Puppeteer/Prerender.io)** | Headless browser snapshots existing SPA pages | POOR -- pages are empty shells until JS runs |
| **C. Static site generation (SSG)** | Generate HTML at build time | PARTIAL -- category pages yes, but products change |
| **D. Full framework migration (Next.js/Nuxt)** | Rewrite in React/Vue with SSR | OVERKILL -- massive rewrite for small catalog |

### Recommendation: EJS Templates on Express (Option A)

**Confidence: HIGH**

Rationale:
- The backend already has Express and direct MongoDB access
- Product catalog is small (likely <200 products across ~6 categories)
- Templates need bilingual support (eng/heb) -- EJS partials handle this well
- Category pages are the highest SEO value (product listings with images)
- Product detail pages need to be created from scratch anyway
- No complex client-side state to hydrate (cart is localStorage, language is localStorage)
- EJS is a zero-config addition to Express (`npm install ejs`, `app.set('view engine', 'ejs')`)

### Why NOT Prerendering

Prerendering (Puppeteer/Prerender.io) would render the existing pages in a headless browser. But the existing category pages start as empty `<div class="inner-products-container"></div>` and only populate after API calls complete. The prerenderer would need to:
1. Wait for all API calls to finish
2. Wait for DOM to populate
3. Snapshot the result

This adds complexity, latency, and a Puppeteer/Chrome dependency with no real advantage over direct template rendering. The backend already has the data -- just render it directly.

### Why NOT Full Framework Migration

The app has ~8 unique pages. The frontend JS views are tightly coupled to DOM manipulation (not a virtual DOM). Migrating to Next.js or Nuxt would mean rewriting every view from scratch. The effort is disproportionate to the SEO benefit for a small handmade jewelry catalog.

---

## 3. Recommended Architecture

### Target Architecture

```
TARGET DEPLOYMENT MODEL
========================

DigitalOcean App Platform - SINGLE Web Service
  |
  +-- Express Server (unified)
        |
        +-- SSR Routes (new EJS templates)
        |     GET /                          -> home.ejs
        |     GET /necklaces                 -> category.ejs (category=necklaces)
        |     GET /crochet-necklaces         -> category.ejs (category=crochetNecklaces)
        |     GET /hoop-earrings             -> category.ejs (category=hoops)
        |     GET /dangle-earrings           -> category.ejs (category=dangle)
        |     GET /product/:slug             -> product.ejs (individual product)
        |     GET /about                     -> about.ejs
        |     GET /contact                   -> contact.ejs
        |     GET /cart                      -> cart.ejs (minimal shell, JS handles)
        |     GET /jewelry-workshop          -> workshop.ejs
        |     GET /policies                  -> policies.ejs
        |
        +-- API Routes (existing, unchanged)
        |     POST /productsByCategory
        |     GET  /allproducts
        |     GET  /getproduct/:id
        |     POST /getcart, /addtocart, etc.
        |     POST /orders, /create-checkout-session
        |
        +-- Static Assets
        |     /static/js/*    (Parcel-built frontend JS)
        |     /static/css/*   (CSS files)
        |     /static/imgs/*  (Static images)
        |
        +-- Image Serving (existing)
              /uploads/*
              /smallImages/*
```

### Hybrid Approach: SSR First Load, JS Enhancement

The architecture follows a "progressive enhancement" pattern, not React-style hydration:

```
BROWSER REQUEST FLOW
=====================

1. Browser requests GET /necklaces
   |
2. Express SSR route handler:
   a. Query MongoDB: Product.find({ category: 'necklaces', available: true })
   b. Detect locale (GeoIP via existing resolveRequestLocale)
   c. Render category.ejs with products array + locale
   d. Send complete HTML with:
      - Full product grid (images, names, prices)
      - JSON-LD structured data
      - Open Graph meta tags
      - Proper <title> and <meta description>
   |
3. Browser receives complete HTML
   - Content is IMMEDIATELY visible (no JS needed)
   - Search engines get full content
   |
4. JavaScript loads and enhances:
   - Language switcher becomes interactive
   - Currency switcher updates prices
   - "Add to Cart" buttons work
   - Product modal (click-to-preview) activates
   - Sticky menu, scroll handlers, etc.
   |
5. Subsequent navigation stays on current pattern
   (full page loads to new SSR pages)
```

This is NOT React hydration. The JS does not "take over" the DOM. Instead:
- SSR provides the initial content
- JS adds interactivity to the already-rendered content
- If JS fails, the page is still readable and navigable (SEO benefit)

---

## 4. Component Architecture

### New Components

```
backend/
  views/                          <-- NEW: EJS templates directory
    layouts/
      main.ejs                    <-- Base layout (head, header, footer)
    partials/
      head.ejs                    <-- <head> with meta, CSS, fonts
      header.ejs                  <-- Site header + nav
      footer.ejs                  <-- Footer
      product-card.ejs            <-- Single product card (reusable)
      json-ld/
        product.ejs               <-- Product structured data
        breadcrumb.ejs            <-- Breadcrumb structured data
        organization.ejs          <-- Organization structured data
    pages/
      home.ejs                    <-- Home page
      category.ejs                <-- Category listing page
      product.ejs                 <-- Individual product detail page
      about.ejs                   <-- About page
      contact.ejs                 <-- Contact page
      cart.ejs                    <-- Cart (shell - JS handles content)
      workshop.ejs                <-- Jewelry workshop page
      policies.ejs                <-- Policies page
      404.ejs                     <-- Not found page

  routes/                         <-- NEW: Route modules
    pages.js                      <-- SSR page route handlers
    seo.js                        <-- Sitemap.xml, robots.txt handlers

  middleware/                     <-- EXISTING (add to)
    auth.js                       <-- (existing)
    ssrCache.js                   <-- NEW: Page-level cache middleware

  services/                       <-- EXISTING (add to)
    exchangeRateService.js        <-- (existing)
    slugService.js                <-- NEW: Product slug generation/lookup

  config/                         <-- EXISTING (add to)
    locale.js                     <-- (existing)
    seoConfig.js                  <-- NEW: URL mappings, meta defaults
```

### Modified Components

| Component | Change | Reason |
|---|---|---|
| `backend/index.js` | Extract route modules, add view engine setup | Monolith needs route extraction for SSR routes |
| `backend/models/Product.js` | Add `slug` field | SEO-friendly product URLs |
| `frontend/js/View.js` | Menu links point to new clean URLs | Navigation consistency |
| `frontend/*.html` | Links updated to new URL structure | All internal links |
| `frontend/package.json` | Build output location change | Static assets served from Express |

### Components NOT Changed

| Component | Reason |
|---|---|
| `frontend/js/controller.js` | Still detects page via body ID, still works |
| `frontend/js/model.js` | API calls unchanged |
| `frontend/js/Views/categoriesView.js` | JS enhancement works on SSR-rendered page |
| `backend/middleware/auth.js` | Auth is API-only, not for page routes |
| Payment routes | Unchanged |

---

## 5. Data Flow

### Category Page Data Flow

```
GET /necklaces
  |
  v
Express Route Handler (routes/pages.js)
  |
  +-- 1. Check SSR cache (ssrCache middleware)
  |     HIT? --> Return cached HTML (fast path)
  |     MISS? --> Continue
  |
  +-- 2. Detect locale
  |     resolveRequestLocale(req)
  |     --> { language: 'eng'|'heb', currency: 'usd'|'ils', country: 'IL'|'US' }
  |
  +-- 3. Query products (DIRECT DB, not API call to self)
  |     Product.find({
  |       category: 'necklaces',
  |       quantity: { $gt: 0 },
  |       available: { $ne: false }
  |     }).sort({ displayOrder: 1 }).lean()
  |
  +-- 4. Get exchange rate (for price display)
  |     exchangeRateService.getRate()
  |
  +-- 5. Render EJS template
  |     res.render('pages/category', {
  |       products,
  |       category: 'necklaces',
  |       locale,
  |       exchangeRate,
  |       meta: { title, description, canonical }
  |     })
  |
  +-- 6. Store in SSR cache
  |     cache.set('necklaces:eng:usd', html, TTL)
  |
  v
Complete HTML Response
```

**Why direct DB query instead of API call to self?**

The Express server IS the API server. Calling `fetch('http://localhost:4000/productsByCategory')` from within Express would:
1. Create unnecessary HTTP overhead (serialization round-trip)
2. Add latency
3. Risk connection pool issues
4. Be architecturally confusing

Instead, extract the DB query logic into a shared service:

```javascript
// backend/services/productService.js (NEW)
const Product = require('../models/Product');

async function getProductsByCategory(category, options = {}) {
  const { page, limit = 50, includeUnavailable = false } = options;

  const filter = { category };
  if (!includeUnavailable) {
    filter.quantity = { $gt: 0 };
    filter.available = { $ne: false };
  }

  let query = Product.find(filter).sort({ displayOrder: 1 }).lean();

  if (page && limit) {
    query = query.skip((page - 1) * limit).limit(limit);
  }

  return query;
}

async function getProductBySlug(slug) {
  return Product.findOne({ slug }).lean();
}

module.exports = { getProductsByCategory, getProductBySlug };
```

Both the SSR routes AND the API routes use this service. This eliminates code duplication while keeping the API routes backward-compatible.

### Product Detail Page Data Flow

```
GET /product/golden-crochet-necklace
  |
  v
Express Route Handler
  |
  +-- 1. Lookup product by slug
  |     Product.findOne({ slug: 'golden-crochet-necklace' }).lean()
  |
  +-- 2. If not found --> 404 page
  |
  +-- 3. Detect locale + exchange rate
  |
  +-- 4. Render product.ejs with full product data
  |     - All images (desktop/mobile variants)
  |     - Both language names/descriptions
  |     - JSON-LD Product structured data
  |     - Open Graph image
  |     - Breadcrumb (Home > Necklaces > Golden Crochet Necklace)
  |
  v
Complete HTML with all product info
```

---

## 6. URL Structure & Migration

### URL Mapping

| Old URL | New URL | 301 Redirect? |
|---|---|---|
| `/index.html` | `/` | Yes |
| `/html/categories/necklaces.html` | `/necklaces` | Yes |
| `/html/categories/crochetNecklaces.html` | `/crochet-necklaces` | Yes |
| `/html/categories/hoops.html` | `/hoop-earrings` | Yes |
| `/html/categories/dangle.html` | `/dangle-earrings` | Yes |
| `/html/about.html` | `/about` | Yes |
| `/html/contact-me.html` | `/contact` | Yes |
| `/html/cart.html` | `/cart` | Yes |
| `/html/jewelry-workshop.html` | `/jewelry-workshop` | Yes |
| `/html/policies.html` | `/policies` | Yes |
| (none -- was modal) | `/product/:slug` | New page |

### Redirect Middleware

```javascript
// backend/middleware/legacyRedirects.js (NEW)
const REDIRECT_MAP = {
  '/index.html': '/',
  '/html/categories/necklaces.html': '/necklaces',
  '/html/categories/crochetNecklaces.html': '/crochet-necklaces',
  '/html/categories/hoops.html': '/hoop-earrings',
  '/html/categories/dangle.html': '/dangle-earrings',
  '/html/about.html': '/about',
  '/html/contact-me.html': '/contact',
  '/html/cart.html': '/cart',
  '/html/jewelry-workshop.html': '/jewelry-workshop',
  '/html/policies.html': '/policies',
};

function legacyRedirects(req, res, next) {
  const target = REDIRECT_MAP[req.path];
  if (target) {
    return res.redirect(301, target);
  }
  next();
}

module.exports = legacyRedirects;
```

### Transition Strategy

During transition, BOTH old and new URLs work:
1. Old URLs issue 301 redirects to new URLs
2. New URLs serve SSR content
3. All internal links in templates point to new URLs
4. Frontend JS `View.js` menu markup updated to new URLs

Google will follow 301s and update its index to the new URLs. This is the standard, safe migration pattern.

---

## 7. Template Structure

### Layout Pattern

```
main.ejs (layout)
  |
  +-- head.ejs (partial)
  |     - Dynamic <title> and <meta description>
  |     - Canonical URL
  |     - Open Graph tags
  |     - Hreflang tags (eng/heb)
  |     - CSS links
  |     - JSON-LD structured data
  |
  +-- header.ejs (partial)
  |     - Site logo
  |     - Navigation menu (bilingual)
  |     - Language/currency selectors
  |     - Cart icon
  |
  +-- [PAGE CONTENT] <-- injected by specific page template
  |
  +-- footer.ejs (partial)
  |     - Footer links
  |     - Copyright
  |
  +-- scripts.ejs (partial)
        - Parcel-built JS bundle
        - Microsoft Clarity
```

### Template Reuse from Frontend Views

**Can SSR templates reuse frontend View logic?**

NO -- and this is by design. The frontend View classes (`View.js`, `categoriesView.js`, etc.) are DOM manipulation code that:
- Uses `document.querySelector`, `addEventListener`, `innerHTML`
- Is browser-specific (no Node.js compatibility)
- Manages interactive state (modals, scroll, magnifier)

However, there IS content that can be shared:

| Content | Frontend Location | Template Equivalent |
|---|---|---|
| Menu HTML (eng) | `View.js:handleMenuLanguage()` lines 604-692 | `partials/header.ejs` |
| Menu HTML (heb) | Same function, heb branch | Same partial with locale conditional |
| Footer HTML (eng/heb) | `View.js:setFooterLng()` lines 1005-1097 | `partials/footer.ejs` |
| Product card HTML | `categoriesView.js:getProductMarkup()` lines 1249-1343 | `partials/product-card.ejs` |
| Category title logic | `categoriesView.js:setHeaderLng()` | In `pages/category.ejs` |

The EJS templates should be written to produce the SAME HTML structure as the frontend JS, so that when the JS loads and enhances the page, it finds the expected DOM structure. This is critical for the "progressive enhancement" pattern to work.

### Example: Product Card EJS vs JS

The frontend JS `getProductMarkup()` produces:
```html
<div class="item-container" data-id="..." data-quant="..." data-currency="...">
  <div class="product-image-container">
    <picture>
      <source media="(min-width: 768px)" srcset="..." />
      <source media="(max-width: 767px)" srcset="..." />
      <img class="image-item front-image" src="..." alt="..." loading="lazy" />
    </picture>
  </div>
  <div class="item-title">Product Name</div>
  <div class="item-description">Description...</div>
  <div class="item-price">$45</div>
  <button class="add-to-cart-btn">Add to Cart</button>
</div>
```

The EJS partial must produce the SAME structure:
```ejs
<!-- partials/product-card.ejs -->
<div class="item-container"
     data-id="<%= product.id %>"
     data-quant="<%= product.quantity %>"
     data-currency="<%= currencySign %>"
     data-usd-price="<%= Math.round(product.usd_price || 0) %>"
     data-ils-price="<%= Math.round(product.ils_price || 0) %>">
  <div class="product-image-container">
    <picture>
      <source media="(min-width: 768px)" srcset="<%= desktopImage %>" />
      <source media="(max-width: 767px)" srcset="<%= mobileImage %>" />
      <img class="image-item front-image"
           src="<%= desktopImage %>"
           alt="<%= product.name %>"
           loading="lazy" />
    </picture>
  </div>
  <div class="item-title" dir="<%= locale.lang === 'heb' ? 'rtl' : 'ltr' %>">
    <%= product.name %>
  </div>
  <div class="item-description" dir="<%= locale.lang === 'heb' ? 'rtl' : 'ltr' %>">
    <%- truncatedDescription %>
  </div>
  <div class="item-price"><%= currencySign %><%= displayPrice %></div>
  <button class="add-to-cart-btn">
    <%= locale.lang === 'eng' ? 'Add to Cart' : '\u05D4\u05D5\u05E1\u05E3 \u05DC\u05E1\u05DC' %>
  </button>
</div>
```

When `categoriesView.js` loads, it sees the product containers already exist. It can either:
- Skip the initial `fetchProductsByCategory()` and `displayProducts()` call (detect SSR content)
- Or re-fetch and re-render (wasteful but safe as a first step)

The recommended approach: Add a `data-ssr="true"` attribute to the products container. The JS checks for this flag and skips the initial fetch if present, only activating interactivity (modals, add-to-cart, infinite scroll for additional pages).

---

## 8. Build Process Integration

### Current Build Process

```
Frontend:
  Parcel (frontend/index.html) --> frontend/dist/
  - Bundles JS, CSS, images
  - Each HTML file is a separate entry

Backend:
  No build step (plain Node.js)
  npm start --> node index.js
```

### Target Build Process

```
Frontend (modified):
  Parcel builds ONLY JS/CSS/static assets (not HTML pages)
  Output: backend/public/static/
    - js/controller.[hash].js
    - css/home-800plus.[hash].css
    - css/categories-800plus.[hash].css
    - imgs/*
    - etc.

Backend (modified):
  EJS templates in backend/views/ (no build needed, rendered at runtime)
  Static assets served from backend/public/static/
  npm start --> node index.js (serves both SSR pages and API)
```

### Parcel Configuration Change

Currently, Parcel treats each HTML file as an entry point. For SSR, we need Parcel to only bundle JS/CSS without generating HTML files.

**Option A: Use Parcel library mode**
```json
// frontend/package.json
{
  "scripts": {
    "build:assets": "parcel build js/controller.js --dist-dir ../backend/public/static/js"
  }
}
```

**Option B: Keep Parcel HTML build but use only the assets**
Keep the current build and copy only the hashed JS/CSS files to the backend. Less disruptive.

**Recommendation: Option B initially.** Minimal disruption. The Parcel build still works as before, and a postbuild script copies asset files to the backend's public directory. HTML files from the build are simply not used (EJS templates replace them).

```javascript
// frontend/postbuild-ssr.js (NEW)
// After Parcel builds to dist/, copy JS/CSS to backend/public/static/
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const targetDir = path.join(__dirname, '..', 'backend', 'public', 'static');

// Copy JS, CSS, and image files from dist to backend/public/static
// (implementation details omitted for brevity)
```

---

## 9. Caching Strategy

### Cache Layers

```
CACHING ARCHITECTURE
=====================

Layer 1: CDN / Browser Cache (HTTP headers)
  Cache-Control: public, max-age=3600, stale-while-revalidate=600
  - Category pages: 1 hour (products may change)
  - Product pages: 1 hour
  - Static pages (about, policies): 24 hours
  - Static assets (JS/CSS/imgs): 1 year (content-hashed filenames)

Layer 2: In-Memory SSR Cache (node-cache)
  - Keyed by: path + language + currency
  - TTL: 10 minutes for category/product pages
  - TTL: 1 hour for static pages
  - Invalidation: On product create/update/delete API calls

Layer 3: EJS Template Cache (built-in)
  - EJS caches compiled template functions in production
  - No configuration needed (just set NODE_ENV=production)
```

### Cache Invalidation

```javascript
// backend/middleware/ssrCache.js (NEW)
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

function ssrCacheMiddleware(ttl) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const lang = req.query.lang || req.cookies?.language || 'eng';
    const currency = req.query.currency || req.cookies?.currency || 'usd';
    const key = `ssr:${req.path}:${lang}:${currency}`;

    const cached = cache.get(key);
    if (cached) {
      return res.send(cached);
    }

    // Monkey-patch res.send to cache the response
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode === 200 && typeof body === 'string') {
        cache.set(key, body, ttl);
      }
      return originalSend(body);
    };

    next();
  };
}

function invalidateCategory(category) {
  // Flush all cached pages for this category
  const keys = cache.keys().filter(k =>
    k.includes(`/category/${category}`) || k.includes('/')
  );
  keys.forEach(k => cache.del(k));
}

function invalidateAll() {
  cache.flushAll();
}

module.exports = { ssrCacheMiddleware, invalidateCategory, invalidateAll };
```

### Cache Invalidation Triggers

Add cache invalidation calls to existing product management API routes:

| API Route | Cache Action |
|---|---|
| `POST /addproduct` | `invalidateCategory(product.category)` |
| `POST /updateproduct` | `invalidateCategory(product.category)` + `invalidateAll()` if category changed |
| `POST /removeproduct` | `invalidateCategory(product.category)` |
| Exchange rate update job | `invalidateAll()` (prices change) |

---

## 10. Product Slug System

Products currently have numeric IDs but no slugs. SEO requires human-readable URLs.

### Slug Generation

```javascript
// backend/services/slugService.js (NEW)
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove non-alphanumeric
    .replace(/\s+/g, '-')           // Spaces to hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '');          // Trim leading/trailing hyphens
}

// Handle Hebrew names: use English name for slug
// Products have name field (English) which is suitable for slugs
```

### Product Schema Change

```javascript
// Add to Product schema
slug: {
  type: String,
  unique: true,
  sparse: true,
  lowercase: true,
  trim: true,
  index: true,
}
```

### Migration Script

A one-time migration to generate slugs for all existing products based on their English name. Handle duplicates by appending the product ID.

---

## 11. Deployment Impact

### Current: Two Separate Components on App Platform

```
App Platform:
  Component 1: Static Site (frontend)
  Component 2: Web Service (backend API)
```

### Target: Single Web Service

```
App Platform:
  Component 1: Web Service (Express serves everything)
    - SSR pages
    - API routes
    - Static assets (JS/CSS/imgs)
    - Image uploads
```

### Why Merge?

The SSR templates need access to the database (for product data). The backend already has this. Adding a template engine to Express and serving static assets alongside is the simplest approach.

Running two separate services where the frontend is server-rendered means either:
- The frontend component needs its own DB connection (duplication)
- The frontend component calls the backend API (unnecessary HTTP overhead)
- Or they merge (simplest)

### App Platform Configuration Changes

```yaml
# app.yaml (updated)
name: tamar-kfir-jewelry
region: fra1

services:
  - name: web
    source_dir: /backend
    build_command: npm install && cd ../frontend && npm install && npm run build && npm run postbuild-ssr
    run_command: npm start
    http_port: 4000
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
    envs:
      - key: NODE_ENV
        value: production
      - key: SERVER_PORT
        value: "4000"
      # ... other existing env vars
```

### Static Asset Serving in Express

```javascript
// In backend/index.js (added)
app.use('/static', express.static(path.join(__dirname, 'public/static'), {
  maxAge: '1y',          // Hashed filenames = aggressive caching
  immutable: true,
}));

// Favicon
app.use('/favicon.ico', express.static(path.join(__dirname, 'public/static/favicon.ico')));
```

---

## 12. Express Route Structure

### Route Registration Order (Critical)

Express matches routes in registration order. The order matters:

```javascript
// backend/index.js (restructured)

// 1. Security middleware (existing)
app.use(helmet(...));
app.use(cors(...));

// 2. Body parsing (existing)
app.use(express.json());

// 3. Static assets (new -- BEFORE SSR routes for performance)
app.use('/static', express.static('public/static', { maxAge: '1y' }));

// 4. Legacy URL redirects (new)
app.use(legacyRedirects);

// 5. API routes (existing -- prefix with /api/ for clarity)
//    Keep backward compatibility with non-prefixed routes
app.use('/api', apiRoutes);     // New prefixed
app.use('/', apiRoutes);        // Backward compat (existing routes)

// 6. SSR page routes (new -- AFTER API routes)
app.use('/', pageRoutes);

// 7. 404 handler for SSR pages
app.use((req, res) => {
  res.status(404).render('pages/404');
});

// 8. Error handler (existing)
app.use(errorHandler);
```

### Avoiding Route Collisions

The SSR routes (`/necklaces`, `/product/:slug`, `/about`) will not collide with API routes because:
- API routes use POST for data endpoints (`POST /productsByCategory`)
- API routes have distinct paths (`/allproducts`, `/getcart`, `/addtocart`)
- SSR routes are all GET requests to clean path names

One potential collision: `/health` (existing API) vs page routes. Solution: keep `/health` registered before page routes (it already is).

---

## 13. Build Order (Dependencies)

### Phase Dependencies

```
DEPENDENCY GRAPH
=================

[1] Product Slug Migration
     |
     +-- Add slug field to Product schema
     +-- Migration script to generate slugs
     +-- This MUST happen first (product URLs depend on slugs)

[2] Express View Engine Setup (independent of [1])
     |
     +-- Install EJS: npm install ejs
     +-- Configure: app.set('view engine', 'ejs')
     +-- Create views/ directory structure
     +-- Create layout + partials (header, footer, head)

[3] SSR Route Handlers (depends on [1] + [2])
     |
     +-- Create productService.js (shared DB queries)
     +-- Create routes/pages.js (SSR route handlers)
     +-- Register routes in index.js

[4] EJS Page Templates (depends on [2])
     |
     +-- Static pages first (about, contact, policies) - simplest
     +-- Category pages (need product data from [3])
     +-- Product detail pages (need slugs from [1], data from [3])
     +-- Home page (may reference categories)

[5] Frontend JS Adaptation (depends on [4])
     |
     +-- Update View.js menu links to new URLs
     +-- Update categoriesView.js to detect SSR content
     +-- Update all internal links in templates

[6] Build Process Changes (depends on [4])
     |
     +-- Parcel asset-only build
     +-- Asset copy script (frontend/dist → backend/public/static)
     +-- Test that assets load correctly

[7] URL Redirects & Migration (depends on [3])
     |
     +-- Legacy redirect middleware
     +-- robots.txt and sitemap.xml
     +-- Google Search Console URL change

[8] Cache Layer (depends on [3])
     |
     +-- SSR cache middleware
     +-- Cache invalidation hooks in admin routes
     +-- HTTP cache headers

[9] Deployment Merge (depends on all above)
     |
     +-- Merge frontend into backend deployment
     +-- Update app.yaml
     +-- Test on staging
```

### Recommended Phase Sequence

**Phase 1: Foundation** (items 1, 2)
- Product slug migration
- EJS engine setup + base templates
- Low risk, no user-facing changes

**Phase 2: Static SSR Pages** (items 4 partial, 6)
- About, Contact, Workshop, Policies pages via EJS
- Build process changes (asset pipeline)
- Deploy as unified service
- These pages are simple (no product data needed)

**Phase 3: Dynamic SSR Pages** (items 3, 4 remainder, 5)
- Category pages with product data
- Product detail pages (new feature)
- Frontend JS adaptation
- This is the main SEO value delivery

**Phase 4: Migration & Optimization** (items 7, 8)
- URL redirects from old to new
- SSR cache layer
- Sitemap.xml generation
- robots.txt
- Google Search Console verification

---

## 14. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Frontend JS breaks when DOM structure changes | HIGH | EJS must produce identical HTML structure to current JS output. Test with existing JS enabled. |
| API route collisions with SSR routes | MEDIUM | Register API routes BEFORE SSR routes. Use explicit path matching. |
| Parcel asset hashing breaks in SSR templates | MEDIUM | Use a manifest file (Parcel generates one) to map logical names to hashed filenames. |
| Cache serving stale product data | LOW | Short TTL (10 min) + explicit invalidation on product changes. |
| Deployment downtime during merge | LOW | Blue-green deployment on App Platform. Test staging first. |
| SEO ranking fluctuation during URL migration | LOW | 301 redirects transfer SEO equity. Standard practice. |
| Memory usage from SSR cache | LOW | node-cache with TTL auto-evicts. Small catalog = small cache footprint. |

---

## 15. Technology Additions

| Package | Version | Purpose | Install Location |
|---|---|---|---|
| `ejs` | ^3.1.x | Template engine | backend |
| `node-cache` | ^5.1.x | In-memory SSR page cache | backend |
| `express-ejs-layouts` | ^2.5.x | Layout support for EJS (optional) | backend |
| `slugify` | ^1.6.x | URL slug generation (or hand-roll) | backend |

No new frontend dependencies needed.

---

## Sources

- [EJS Documentation](https://ejs.co/) - Template engine docs
- [DigitalOcean - How to Use EJS to Template Your Node Application](https://www.digitalocean.com/community/tutorials/how-to-use-ejs-to-template-your-node-application)
- [DigitalOcean - How to Serve Static Files in Express](https://www.digitalocean.com/community/tutorials/nodejs-serving-static-files-in-express)
- [Prerender.io - SPA JavaScript SEO Challenges and Solutions](https://prerender.io/blog/spa-javascript-seo-challenges-and-solutions/)
- [ClickRank - Is JavaScript Rendering a Powerful SEO Boost or Risk in 2026?](https://www.clickrank.ai/javascript-rendering-affect-seo/)
- [PixelFreeStudio - How to Handle Caching in Server-Side Rendering](https://blog.pixelfreestudio.com/how-to-handle-caching-in-server-side-rendering/)
- [Medium - Simple server side cache for Express.js](https://medium.com/the-node-js-collection/simple-server-side-cache-for-express-js-with-node-js-45ff296ca0f0)
- [Shopify Engineering - Simplify, Batch, and Cache: How We Optimized Server-side Storefront Rendering](https://shopify.engineering/simplify-batch-cache-optimized-server-side-storefront-rendering)
- [GitHub - prerender-node Express middleware](https://github.com/prerender/prerender-node)
- [LovableHTML - Prerender.io Alternatives 2025](https://lovablehtml.com/blog/prerender-io-alternatives)
- [Google Search Central - AJAX Crawling Scheme Deprecation](https://www.seroundtable.com/google-to-stop-crawling-old-ajax-scheme-24636.html)
- [OHO Interactive - Hash Symbols in URLs and SEO](https://www.oho.com/blog/explained-60-seconds-hash-symbols-urls-and-seo)
- [DigitalOcean - How to Manage Static Sites in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/)
- [DigitalOcean - Deploy Express Application on App Platform](https://www.digitalocean.com/community/tutorials/how-to-deploy-an-express-application-and-scale-with-memcachier-on-digitalocean-app-platform)
