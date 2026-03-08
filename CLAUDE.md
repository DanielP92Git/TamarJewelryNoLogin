# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-commerce application for handmade jewelry sales (Tamar Kfir Jewelry). Full-stack app with:
- Frontend SPA using MVC architecture
- Node.js/Express REST API backend
- Admin dashboard
- Multi-language (English/Hebrew with RTL) and multi-currency (USD/ILS) support

## Development Commands

### Frontend (from /frontend)
```bash
npm run dev          # Development server with cache cleanup
npm run build        # Production build to ./dist
npm run lint         # ESLint
```

### Backend (from /backend)
```bash
npm run devStart     # Development with nodemon auto-reload
npm start            # Production
npm run lint         # ESLint
```

## Architecture

### Frontend MVC Pattern (`/frontend/js/`)
- **model.js**: Data layer - localStorage, cart state, API calls to backend
- **View.js**: Base view class - DOM management, language/currency selectors, header menu
- **controller.js**: Router - page navigation, view instantiation, model method calls
- **Views/**: Page-specific views extending base View class (homePageView, cartView, categoriesView, etc.)

### Backend (`/backend/`)
- **index.js**: Main Express server (monolithic - routes, middleware, payment processing)
- **models/**: Mongoose schemas (User, Product, Settings)
- **middleware/auth.js**: JWT authentication and role-based access control
- **services/exchangeRateService.js**: USD/ILS currency conversion
- **jobs/exchangeRateJob.js**: Scheduled exchange rate updates via node-cron
- **config/locale.js**: GeoIP-based locale detection

### Key Integrations
- **Payments**: PayPal SDK and Stripe API
- **Image Storage**: DigitalOcean Spaces (S3-compatible) with Sharp for processing
- **Email**: EmailJS for contact forms
- **Analytics**: Microsoft Clarity

## Locale System

The app supports dual languages and currencies:
- Languages: English (`eng`) and Hebrew (`heb`) - Hebrew uses RTL styling
- Currencies: USD and ILS with automatic exchange rate conversion
- Detection: GeoIP-based with fallbacks to CDN headers

Frontend locale logic is in `/frontend/js/locale.js` and base View class.

## CSS Organization

Responsive design with 800px breakpoint:
- `*-800plus.css`: Desktop styles (≥800px)
- `*-devices.css`: Mobile/device styles (<800px)
- RTL support via conditional styling for Hebrew

## Environment Variables

See `/backend/env.example` for required configuration including:
- MongoDB connection string
- JWT secret
- DigitalOcean Spaces credentials
- PayPal/Stripe API keys
- Exchange rate API key

## API Routing (post-SSR migration)

After the SSR migration, the backend serves everything from `/` — there is **no `/api` prefix** on routes. The admin dashboard (`admin/BisliView.js`) uses `https://tamarkfir.com` as its production `API_URL`.

**If admin API calls break (404s on `/api/...`)**, the fallback fix is to add an `/api`-stripping middleware in `backend/index.js` right after `cookieParser()`:
```js
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});
```

## SSR Caching

- **In-memory page cache** via `node-cache` (1-hour TTL) in `backend/cache/pageCache.js`
- **Cache middleware** (`backend/middleware/cacheMiddleware.js`): caches GET requests for public pages, sets `Cache-Control: public, no-cache`
- **Cache invalidation** (`backend/cache/invalidation.js`): `invalidateProduct(slug, categorySlug)` and `invalidateCategory(categorySlug)` clear cached pages when products are added/updated
- SSR category pages (`backend/routes/ssrDynamic.js`) render **all products** (no limit) sorted by `displayOrder`
- The frontend (`categoriesView.js`) sets `allProductsFetched = true` for SSR pages, so no additional API fetching occurs

## Product Images

### Storage & URL Structure
- Images are processed by `processImage()` in `backend/index.js` using Sharp (desktop 1200px, mobile 600px WebP)
- Stored locally in `backend/uploads/` + `backend/public/uploads/` (main) and `backend/smallImages/` + `backend/public/smallImages/` (gallery)
- Uploaded to DigitalOcean Spaces CDN for durable storage (`tamar-jewelry-images.fra1.cdn.digitaloceanspaces.com`)
- Product schema has multiple image formats: unified `images` array (Phase 7, preferred), legacy `mainImage` object, legacy `smallImages` array

### Image URL Normalization
- `normalizeProductForClient()` in `backend/index.js` converts relative paths to absolute URLs, applies `localAssetExistsForUrl` checks, and derives legacy fields from the `images` array — used for **API responses only**, NOT for SSR rendering
- SSR templates (`category.ejs`, `product.ejs`) receive raw DB data; image URLs must work as-is (CDN absolute URLs or relative paths)

### CORS — Do NOT use `crossorigin="anonymous"` on product images
- The DigitalOcean Spaces CDN does not send CORS headers for `localhost`, so `crossorigin="anonymous"` on `<img>`/`<source>` tags breaks images in local dev
- This attribute was removed from all SSR EJS templates and frontend JS (`categoriesView.js` modal/gallery/product card rendering)
- Regular `<img>` tags without `crossorigin` load cross-origin images fine — CORS is only enforced when the attribute is present or images are used in canvas

### SSR Gallery Images
- Category page (`category.ejs`) embeds gallery images as JSON in `data-images` attribute on each product card
- `extractProductsFromDOM()` in `categoriesView.js` parses this JSON to populate `product.images` for modal/preview use
- Product detail page (`product.ejs`) renders thumbnail strip server-side with click-to-swap inline JS
- Both templates handle legacy fallback: `product.images` array → `product.mainImage` + `product.smallImages`

## Admin Dashboard

- **`admin/BisliView.js`**: Single-file SPA for all admin functionality
- Product forms use bilingual fields (`id="name-en"`, `id="name-he"`); the hidden `id="name"` field is populated inside `addProduct()`, not before
- Validation in `runSubmit()` checks bilingual name fields directly (not the hidden field)
- `addProduct()` reads all form values from DOM independently of the `data` parameter passed to it
- **Slug generation**: Mongoose pre-save hook in `Product.js` auto-generates slugs using `slugify` from `this.name`; Hebrew-only names may produce empty slugs
- **Live Server reload issue**: Image uploads trigger file writes that cause VS Code Live Server to auto-reload. Configured in `.vscode/settings.json` with `liveServer.settings.ignoreFiles` to exclude `backend/uploads/`, `backend/public/`, `backend/smallImages/`, and `frontend/dist/`

## Frontend Build

- Parcel bundles frontend JS/CSS into `frontend/dist/` with content-hashed filenames
- Backend reads `dist/index.html` at startup to extract `<script>` tags (`bundleScripts` variable) for EJS templates
- **After rebuilding frontend, the backend must be restarted** to pick up new bundle hashes
- **Clean builds**: Old hashed files linger in `dist/`; use `rm -rf dist && npm run build` to ensure stale files don't get served

## Deployment

Target: DigitalOcean (App Platform or Droplets)
- See `DIGITALOCEAN_SETUP.md` for clean URL rewriting configuration
- Images served from DigitalOcean Spaces CDN
