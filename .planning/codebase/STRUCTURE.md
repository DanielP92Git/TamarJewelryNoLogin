# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
project-root/
├── frontend/                           # Client-side SPA application
│   ├── js/                            # JavaScript source (MVC pattern)
│   │   ├── Views/                     # Page-specific view classes
│   │   │   ├── homePageView.js
│   │   │   ├── categoriesView.js
│   │   │   ├── cartView.js
│   │   │   ├── aboutView.js
│   │   │   ├── workshopView.js
│   │   │   ├── contactMeView.js
│   │   │   └── policiesView.js
│   │   ├── View.js                    # Base view class (shared DOM, locale, currency)
│   │   ├── controller.js              # Router & event coordination
│   │   ├── model.js                   # State management & API calls
│   │   └── locale.js                  # Client-side locale detection & persistence
│   ├── html/                          # HTML entry points (not bundled)
│   │   ├── categories/                # Category pages (one per jewelry type)
│   │   ├── templates/                 # Shared HTML partials (header, footer, menu)
│   │   ├── index.html                 # Home page
│   │   ├── cart.html
│   │   ├── about.html
│   │   ├── jewelry-workshop.html
│   │   ├── contact-me.html
│   │   └── policies.html
│   ├── css/                           # Stylesheets (responsive)
│   │   ├── cssTemplates/              # Reusable style snippets
│   │   ├── *-800plus.css              # Desktop styles (≥800px)
│   │   └── *-devices.css              # Mobile styles (<800px)
│   ├── imgs/                          # Images & assets
│   │   ├── Hero-imgs/                 # Homepage hero carousel images
│   │   ├── website-images/            # Category & product images
│   │   ├── svgs/                      # Icon SVGs (navigation, cart, close, etc.)
│   │   ├── icons/
│   │   ├── favicon/
│   │   └── videos/
│   ├── dist/                          # Build output (Parcel)
│   └── package.json                   # Frontend dependencies (Parcel, ESLint)
│
├── backend/                            # Node.js/Express API server
│   ├── index.js                       # Main server (monolithic - all routes & middleware)
│   ├── index-prev.js                  # Previous version (backup)
│   ├── reset-admin-password.js        # Admin credential reset script
│   ├── html-rewrite-middleware.js     # Custom middleware for clean URL rewriting
│   ├── models/                        # Mongoose schemas
│   │   ├── index.js                   # Schema exports
│   │   ├── Product.js                 # Product with image variants (desktop/mobile)
│   │   ├── User.js                    # User with cart & auth fields
│   │   └── Settings.js                # Global settings (exchange rate, config)
│   ├── middleware/
│   │   └── auth.js                    # JWT validation, role-based access control
│   ├── services/
│   │   └── exchangeRateService.js     # USD/ILS rate fetching with fallback chain
│   ├── jobs/
│   │   └── exchangeRateJob.js         # Scheduled exchange rate updates (node-cron)
│   ├── config/
│   │   ├── db.js                      # MongoDB connection
│   │   └── locale.js                  # GeoIP detection, CDN header parsing
│   ├── uploads/                       # Local image storage (temp, non-persistent)
│   ├── smallImages/                   # Thumbnail storage (temp)
│   ├── public/                        # Public assets
│   │   ├── uploads/                   # Fallback for image serving
│   │   └── smallImages/
│   ├── env.example                    # Environment variable template
│   └── package.json                   # Backend dependencies (Express, Mongoose, PayPal, Sharp, etc.)
│
├── .planning/                          # GSD planning documents (auto-generated)
│   └── codebase/
│
├── CLAUDE.md                          # Project guidance for Claude
├── DIGITALOCEAN_SETUP.md              # Deployment configuration
└── README.md                          # Project overview
```

## Directory Purposes

**frontend/js:**
- Purpose: Core application logic, MVC implementation
- Contains: View classes (ES6), controller router, model state manager, locale utilities
- Key files: controller.js (entry point), View.js (base class), model.js (API layer)

**frontend/js/Views:**
- Purpose: Page-specific UI rendering and event handling
- Contains: One View subclass per page (inherits from View base class)
- Pattern: Each view extends View, overrides setXxxLanguage() and handleLanguage() for page-specific content
- Examples: homePageView extends View, adds image slider, sticky menu handlers

**frontend/html:**
- Purpose: Static HTML templates (not bundled by Parcel)
- Contains: One entry point per page, includes shared templates via comments or server-side includes
- Key: Each HTML file loads the Parcel-bundled JS bundle and triggers controller
- Template organization: header, footer, menu in separate template files

**frontend/css:**
- Purpose: Responsive stylesheets with RTL support
- Pattern: Breakpoint-based organization (800px = desktop/mobile split)
- Files: `*-800plus.css` loaded via media query or separate stylesheet, `*-devices.css` for mobile
- RTL: Hebrew pages apply `dir="rtl"` to HTML element, conditional CSS handles text alignment

**backend/index.js:**
- Purpose: Monolithic server application
- Contains: All route handlers, middleware setup, payment integrations (PayPal, Stripe), image upload
- Size: Large (~1000+ lines) - contains business logic inline rather than extracted to separate files
- Routes: /api/products, /api/cart, /api/payments/*, /upload, /addproduct, /admin/*, /locale

**backend/models:**
- Purpose: Database schema definitions
- Product.js: Complex image handling (mainImage object with desktop/mobile/public variants, smallImages array)
- User.js: Cart field (array), email, password, userType (admin/user)
- Settings.js: usd_ils_rate, exchange_rate_last_updated, configuration

**backend/middleware/auth.js:**
- Purpose: JWT-based authentication
- Exports: getTokenFromRequest (extracts token from headers), authUser (login), fetchUser (middleware), requireAdmin
- Pattern: authUser and fetchUser both used as express middleware, requireAdmin used as final guard

**backend/config:**
- Purpose: Environment setup and external service configuration
- db.js: MongoDB connection with retry logic
- locale.js: Client IP extraction, GeoIP lookup, CDN header parsing (Cloudflare, Vercel, etc.)

**backend/services:**
- Purpose: Business logic abstraction
- exchangeRateService.js: Single source of truth for USD/ILS conversion, tries multiple APIs with fallback

**backend/jobs:**
- Purpose: Scheduled background tasks
- exchangeRateJob.js: node-cron job that updates Settings.usd_ils_rate periodically

**backend/uploads, backend/smallImages:**
- Purpose: Local file storage for images (development fallback)
- Note: Ephemeral on production (DigitalOcean App Platform), use DigitalOcean Spaces in production

## Key File Locations

**Entry Points:**

- `frontend/html/index.html`: Home page, imports Parcel-bundled JS, triggers homePageView via controller
- `backend/index.js`: Express server main file, starts on port 5000 (default)

**Configuration:**

- `frontend/.env` or `frontend/.env.local`: API_URL, build settings (Parcel)
- `backend/.env` or `backend/env.example`: All backend config (DB, JWT, PayPal, Stripe, DigitalOcean, exchange rate API)

**Core Logic:**

- `frontend/js/View.js`: Base class with setLanguage(), changeToHeb(), changeToEng(), header/menu rendering
- `frontend/js/model.js`: handleLoadStorage(), checkCartNumber(), addToCart() functions
- `frontend/js/controller.js`: controlHomePage(), controlAboutPage(), event delegation setup
- `backend/middleware/auth.js`: JWT verification, user lookup, admin checks
- `backend/services/exchangeRateService.js`: getExchangeRate() with fallback chain

**Database Models:**

- `backend/models/Product.js`: Product schema with mainImage (object), smallImages (array)
- `backend/models/User.js`: User schema with cart, password, email, userType
- `backend/models/Settings.js`: Settings schema with usd_ils_rate, timestamps

**Testing:**

- No dedicated test files present (none detected)

## Naming Conventions

**Files:**

- Views: `*View.js` in PascalCase (homePageView.js, categoriesView.js)
- Pages: Kebab-case for HTML files (about.html, jewelry-workshop.html, contact-me.html)
- CSS: Kebab-case with breakpoint suffix (*-800plus.css, *-devices.css)
- Utilities: Lowercase with descriptive names (locale.js, model.js, controller.js)
- Config: Descriptive names in lowercase (db.js, locale.js)

**Directories:**

- Features: PascalCase (Views, Spaces) or lowercase (js, css, models, middleware)
- Categories: Lowercase plural (categories, uploads, smallImages)

**JavaScript Variables & Functions:**

Frontend:
- Functions: camelCase (handleLoadStorage, checkCartNumber, setLanguage)
- Classes: PascalCase (View, HomePageView, Model)
- Constants: UPPER_SNAKE_CASE (LANGUAGE_KEY, CURRENCY_KEY)
- localStorage keys: kebab-case (language, currency, cart, auth-token)

Backend:
- Functions: camelCase (fetchUserCartAPI, normalizeProductForClient)
- Classes: PascalCase (Product, User, Settings - Mongoose models)
- Middleware: Named functions (authUser, fetchUser, requireAdmin)
- Constants: UPPER_SNAKE_CASE (ALLOWED_IMAGE_EXTENSIONS, PAYPAL_CLIENT_ID)

## Where to Add New Code

**New Feature (Product Display Page):**
- Primary code: `frontend/js/Views/newFeatureView.js` (extend View class)
- HTML: `frontend/html/newFeature.html` (link Parcel bundle, include templates)
- CSS: `frontend/css/newFeature-800plus.css` and `frontend/css/newFeature-devices.css`
- Controller: Add controlNewFeature() function in `frontend/js/controller.js`
- Backend: Add new route in `backend/index.js` (e.g., /api/newfeature)
- Tests: None currently enforced

**New Component/Module (Reusable View Part):**
- Implementation: `frontend/js/` (either add method to View base class or extract separate module)
- Usage: Import in specific view (e.g., `import { modalComponent } from './components.js'`)
- Pattern: Export as function or class, call from view's render method

**New Service (External API Integration):**
- Implementation: `backend/services/newService.js` (export async functions, use try-catch with fallbacks)
- Usage: Import in `backend/index.js` routes, call from route handlers
- Pattern: Follow exchangeRateService.js model (fetch → cache → fallback)

**Utilities:**
- Frontend utilities: `frontend/js/utils/` (new directory if none exist) or add to locale.js
- Backend utilities: `backend/utils/` (new directory) or add to appropriate config/service file
- Pattern: Export pure functions or simple factories

**Database Schema Addition:**
- New collection: `backend/models/NewModel.js` (follow Product.js/User.js structure)
- Updates to existing model: Edit `backend/models/Product.js`, add fields with type and default
- Changes: No migrations system present; update schema and test manually with MongoDB

## Special Directories

**frontend/dist:**
- Purpose: Build output from Parcel bundler
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**frontend/.parcel-cache:**
- Purpose: Parcel build cache
- Generated: Yes (during `npm run dev`)
- Committed: No

**backend/node_modules:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No

**backend/uploads, backend/smallImages:**
- Purpose: Local image storage (fallback for development)
- Generated: Yes (during image upload routes)
- Committed: No (user-generated, transient)

**.planning/codebase:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes

**frontend/html/templates:**
- Purpose: Reusable HTML snippets (header, footer, menu)
- Generated: No (manually authored)
- Committed: Yes (source code)

---

*Structure analysis: 2026-02-01*
