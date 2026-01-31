# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
Online/
├── frontend/                    # SPA frontend (Parcel bundler)
│   ├── js/                      # JavaScript MVC implementation
│   │   ├── controller.js        # Router and page initialization
│   │   ├── model.js             # Data layer, API calls, cart state
│   │   ├── View.js              # Base view class with shared UI logic
│   │   ├── locale.js            # Language/currency detection and persistence
│   │   └── Views/               # Page-specific view classes
│   │       ├── homePageView.js
│   │       ├── cartView.js
│   │       ├── categoriesView.js
│   │       ├── contactMeView.js
│   │       ├── workshopView.js
│   │       ├── aboutView.js
│   │       └── policiesView.js
│   ├── css/                     # Responsive stylesheets
│   │   ├── *-800plus.css        # Desktop styles (≥800px breakpoint)
│   │   ├── *-devices.css        # Mobile styles (<800px)
│   │   └── standard-reset.css   # CSS reset
│   ├── html/                    # Static HTML templates (partial pages)
│   │   ├── about.html
│   │   ├── cart.html
│   │   ├── contact-me.html
│   │   ├── jewelry-workshop.html
│   │   ├── policies.html
│   │   ├── categories/          # Category-specific HTML
│   │   └── templates/           # Reusable HTML snippets
│   ├── imgs/                    # Static images and SVG assets
│   ├── index.html               # SPA entry point (single HTML file)
│   ├── package.json             # Frontend dependencies (Parcel, EmailJS, Testing)
│   ├── .parcelrc                # Parcel bundler config
│   ├── dist/                    # Built output (generated)
│   └── .env                     # Frontend env vars (API_URL)
├── backend/                     # Node.js Express API server
│   ├── index.js                 # Monolithic Express app (all routes, ~3500 lines)
│   ├── config/                  # Configuration modules
│   │   ├── db.js                # MongoDB connection setup
│   │   └── locale.js            # GeoIP-based locale detection
│   ├── middleware/              # Express middleware
│   │   └── auth.js              # JWT verification, password auth, role checks
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js              # User schema (email, password, cart, userType)
│   │   ├── Product.js           # Product schema (name, prices, images, categories)
│   │   ├── Settings.js          # App settings (exchange rates, discounts)
│   │   └── index.js             # Module exports
│   ├── services/                # Business logic services
│   │   └── exchangeRateService.js # Fetch and cache USD/ILS conversion rates
│   ├── jobs/                    # Scheduled tasks
│   │   └── exchangeRateJob.js   # Daily exchange rate update (node-cron)
│   ├── uploads/                 # Local file storage (dev only, ephemeral in prod)
│   ├── smallImages/             # Cached thumbnail directory
│   ├── public/                  # Public static assets
│   ├── scripts/                 # Utility scripts (migrations, tools)
│   ├── package.json             # Backend dependencies (Express, Mongoose, Payment SDKs)
│   ├── .env                     # Backend secrets (API keys, DB URI)
│   └── env.example              # Template for required env vars
├── admin/                       # Admin dashboard (minimal structure)
│   ├── index.html               # Admin entry point
│   ├── BisliView.js             # Single admin view component (~3500 lines)
│   └── assets/                  # Admin static files
├── public/                      # Root-level static files served by server
├── .git/                        # Git repository
├── .planning/                   # GSD planning documents (new)
│   └── codebase/
├── CLAUDE.md                    # Project guidelines and architecture overview
├── DIGITALOCEAN_SETUP.md        # Deployment configuration
├── FAVICON_FIX.md               # Notes on favicon generation
├── package.json                 # Root package (if workspace)
└── prettier.config.js           # Code formatting config
```

## Directory Purposes

**frontend/js/:**
- Purpose: Core SPA logic - routing, data management, view rendering
- Contains: Module-based JavaScript (ES6 imports/exports, Parcel-bundled)
- Key files: `controller.js` (orchestrator), `model.js` (state), `View.js` (base component), `locale.js` (i18n)

**frontend/css/:**
- Purpose: Responsive styles organized by page and breakpoint
- Contains: Separate files per page (home, cart, categories, etc.) + breakpoint variants (800plus, devices)
- Pattern: `home-800plus.css` for desktop, `home-devices.css` for mobile; RTL handled via conditional class selectors

**frontend/html/:**
- Purpose: Static HTML structure templates loaded dynamically by views
- Contains: Markup for each page (about.html, cart.html, contact-me.html, etc.)
- Pattern: Rendered into DOM by view classes; language switching done via display:none on parallel HTML blocks

**frontend/imgs/:**
- Purpose: Static image and SVG asset storage
- Contains: Product images (cached from DigitalOcean in prod), SVG icons (shopping-bag, menu bars, close X), background images

**backend/:**
- Purpose: Express REST API server and MongoDB interface
- Contains: Monolithic app with inline route definitions (~115K lines in index.js); modular config, models, middleware, services

**backend/config/:**
- Purpose: Initialization and configuration modules
- Contains: `db.js` manages MongoDB connection; `locale.js` provides GeoIP-based locale detection for API responses

**backend/middleware/:**
- Purpose: HTTP request preprocessing
- Contains: `auth.js` exports functions for JWT verification (fetchUser), password authentication (authUser), role enforcement (requireAdmin)

**backend/models/:**
- Purpose: MongoDB data structure definitions
- Contains: Mongoose schemas for User (authentication, cart), Product (inventory, pricing), Settings (exchange rates, app config)

**backend/services/:**
- Purpose: Reusable business logic for external integrations
- Contains: `exchangeRateService.js` for fetching USD-to-ILS rates from external API, caching in MongoDB

**backend/jobs/:**
- Purpose: Scheduled background tasks
- Contains: `exchangeRateJob.js` runs daily via node-cron to update exchange rates

**admin/:**
- Purpose: Dashboard for content/order management
- Contains: Single `BisliView.js` (~3500 lines, monolithic like backend index.js); accessed via protected routes in backend

## Key File Locations

**Entry Points:**
- `frontend/index.html`: SPA entry point; loads parcel-bundled js/controller.js module script
- `backend/index.js`: API server entry point; defines all routes and middleware
- `admin/index.html`: Admin dashboard entry point

**Configuration:**
- `frontend/.env`: API_URL for backend
- `backend/.env`: Secrets (MongoDB URI, JWT key, PayPal/Stripe keys, DigitalOcean credentials, exchange rate API key)
- `frontend/.parcelrc`: Parcel bundler configuration
- `backend/package.json`: Backend dependencies and scripts

**Core Logic:**
- `frontend/js/model.js`: API calls, cart state management, localStorage persistence
- `frontend/js/controller.js`: Page routing, view initialization, locale setup
- `frontend/js/View.js`: Base class for all views; shared DOM manipulation, language/currency switching
- `frontend/js/locale.js`: Language/currency detection and synchronization with backend
- `backend/index.js`: All route definitions, payment processing, file uploads, order management

**Styling:**
- `frontend/css/standard-reset.css`: Global CSS reset
- `frontend/css/desktop-menu.css`: Shared desktop navigation styles
- `frontend/css/home-800plus.css`, `frontend/css/home-devices.css`: Page-specific responsive styles
- `frontend/css/*-devices.css` and `frontend/css/*-800plus.css`: Breakpoint-specific variants for each page

**Testing/Utilities:**
- `frontend/package.json`: Testing libraries (@testing-library/user-event, @testing-library/jest-dom)
- `backend/reset-admin-password.js`: Admin password reset utility
- `frontend/generate-favicon.js`: Favicon generation script
- `frontend/postbuild.js`: Post-build processing (called by `npm run postbuild`)

## Naming Conventions

**Files:**
- JavaScript: camelCase (model.js, controller.js, homePageView.js, exchangeRateService.js)
- CSS: kebab-case with breakpoint suffix (home-800plus.css, mobile-menu.css, footer-desktop.css)
- HTML: kebab-case (contact-me.html, jewelry-workshop.html)
- Schemas/Classes: PascalCase (User.js, Product.js, Settings.js, View, HomePageView)

**Directories:**
- Lowercase, plural for collections (Views/, models/, middleware/, services/, jobs/, uploads/)
- Except: Mixed casing in css/ (both descriptive files and utility files)

**JavaScript Variables/Functions:**
- Constants: UPPERCASE_WITH_UNDERSCORES (API_URL, JWT_KEY, LANGUAGE_KEY, CURRENCY_STORAGE_KEY)
- Functions: camelCase (handleLoadStorage, checkCartNumber, setLanguage, changeToHeb)
- Classes: PascalCase (View, HomePageView, CartView)
- DOM selectors: camelCase with underscore prefix in View class (_cartNumber, _menu, _menuHeb)
- Private/internal: underscore prefix (_data, _addHandler, _imageSlider)

**CSS Classes:**
- kebab-case: .header-cart, .cart-container, .categories-container_heb, .menu-button, .go-to-top
- Suffix for language variants: _heb, _eng (e.g., .ul-heb, .footer_eng)
- Breakpoint-specific: -800plus, -devices (in filename, not class selector)

## Where to Add New Code

**New Frontend Page/Feature:**
- Create view class in `frontend/js/Views/featureName.js` extending View class
- Create control function in `frontend/js/controller.js` (controlFeatureName)
- Create HTML template in `frontend/html/featureName.html`
- Create CSS files: `frontend/css/featureName-800plus.css` and `frontend/css/featureName-devices.css`
- Import view in controller, add route handler in window.addEventListener('hashchange', ...) or Router pattern
- Add language strings via duplication in HTML blocks or implement string translation function

**New Backend API Endpoint:**
- Add route handler in `backend/index.js` (app.get/post/put/delete('/endpoint', middlewares, handler))
- If authentication required, include `fetchUser` middleware before handler
- If admin-only, include `requireAdmin` middleware after `fetchUser`
- Return JSON response: `res.json({ success: true, data: ... })` or `res.status(400).json({ errors: 'message' })`
- Add rate limiting middleware if needed (authRateLimiter, paymentRateLimiter)

**New Database Model:**
- Create schema file in `backend/models/ModelName.js` using Mongoose
- Export model as `module.exports = mongoose.model('ModelName', schema)`
- Add to exports in `backend/models/index.js`
- Update model imports in `backend/index.js` and services

**New Scheduled Task:**
- Create job file in `backend/jobs/jobName.js`
- Use node-cron for scheduling (pattern-based or specific times)
- Import and invoke in `backend/index.js` (startJobName() or runJobName())
- Add env var to control enable/disable if needed

**Utilities/Helpers:**
- Frontend utilities: Create in `frontend/js/utils/` (new directory) or add to existing service files
- Backend utilities: Create in `backend/services/` directory for reusable business logic

**Admin Dashboard Additions:**
- Update `admin/BisliView.js` (single monolithic file)
- Use same pattern as backend routes: check `req.user.userType === 'admin'` in backend handlers
- Frontend admin calls backend /api/admin/* endpoints

## Special Directories

**frontend/dist/:**
- Purpose: Production build output
- Generated: Yes (by `npm run build` via Parcel)
- Committed: No (.gitignore excludes)
- Contents: Bundled JS, CSS, HTML, images with hashes for cache busting

**frontend/.parcel-cache/:**
- Purpose: Parcel development cache
- Generated: Yes (by `npm run dev`)
- Committed: No (.gitignore excludes)
- Note: Cleaned on dev start via `npm run cleanup`

**backend/uploads/ and backend/smallImages/:**
- Purpose: Temporary image storage during development
- Generated: Yes (by image upload handlers)
- Committed: No (.gitignore excludes)
- Note: Ephemeral in production (App Platform filesystem not persistent); use DigitalOcean Spaces instead

**backend/node_modules/ and frontend/node_modules/:**
- Purpose: Package dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore excludes)

**admin/assets/:**
- Purpose: Admin dashboard static files (images, CSS, fonts)
- Generated: No (committed)
- Committed: Yes

## File Organization Patterns

**Frontend MVC Module Pattern:**
- Each view is a class file in Views/ extending View base
- Views use ES6 imports to import View base and model functions
- Controller imports all view classes and instantiates them on route change
- Locale system is standalone module imported by controller and View

**Backend Monolithic Pattern:**
- All routes defined in single index.js file (not modular, ~115K lines)
- Middleware applied via app.use() at top, specific to routes via route parameter
- Models imported at top, used directly in route handlers
- Services imported and called from route handlers

**CSS Breakpoint Pattern:**
- Two separate stylesheets per page: `-800plus.css` (desktop) and `-devices.css` (mobile)
- Linked in HTML with media queries: `media="(min-width: 800px)"` and `media="(max-width: 799.9px)"`
- No mixins or SCSS preprocessing; plain CSS
- RTL support via duplicate HTML elements and CSS class selectors (.ul-heb, .ul-eng)

**Language/Currency Persistence Pattern:**
- localStorage keys: 'language' (eng/heb), 'currency' (usd/ils), 'auth-token'
- All views access localStorage directly or via View base class methods
- Locale.js synchronizes with backend via /api/locale endpoint for GeoIP detection
- Custom events dispatched on currency change for cross-page updates

---

*Structure analysis: 2026-01-31*
