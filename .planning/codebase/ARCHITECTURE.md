# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Full-stack MVC with separated frontend SPA (Model-View-Controller) and monolithic Express backend API.

**Key Characteristics:**
- Frontend: Single Page Application with MVC architecture (model.js handles state, View.js base class + page-specific views, controller.js routes)
- Backend: Monolithic Express server with inline route handlers, middleware, and services
- Data flow: Frontend fetches/mutates via API calls, caches in localStorage, backend manages MongoDB persistence
- Multi-locale support: Language (English/Hebrew with RTL) and currency (USD/ILS) switching with persistence
- Decoupled deployment: Frontend builds to static dist/ served separately; backend runs independently

## Layers

**Frontend Model Layer:**
- Purpose: Data management, API communication, cart state, localStorage persistence
- Location: `frontend/js/model.js`
- Contains: Exported functions for API calls (fetchUserCartAPI, getAPI), cart array management, storage handlers
- Depends on: Window global (localStorage, fetch), backend API endpoints
- Used by: All views via controller, components access cart and user data

**Frontend View Layer:**
- Purpose: DOM manipulation, event handling, rendering, UI state management
- Location: `frontend/js/View.js` (base), `frontend/js/Views/*.js` (page-specific)
- Contains: Base View class with shared methods (language/currency handling, menu toggle, DOM queries), specialized views (homePageView, cartView, categoriesView, etc.) extending View
- Depends on: DOM selectors, model.js for data, locale.js for i18n
- Used by: Controller instantiates and calls view methods; views interact with model

**Frontend Controller Layer:**
- Purpose: Router and orchestrator - handles page navigation, view instantiation, event binding
- Location: `frontend/js/controller.js`
- Contains: Control functions per page (controlHomePage, controlWorkshopPage, etc.), imports all views, coordinates locale setup
- Depends on: View classes, model.js, locale.js
- Used by: Parcel entry point (via index.html script tag)

**Frontend Locale Layer:**
- Purpose: Language/currency detection, persistence, browser-locale mapping, backend sync
- Location: `frontend/js/locale.js`
- Contains: Functions to detect locale from browser (navigator.language, timezone), fetch from backend, persist to localStorage, map ISO codes to app format (eng/heb, usd/ils)
- Depends on: Window globals (navigator, Intl, localStorage), backend /api/locale endpoint
- Used by: Controller during bootstrap, View class for language switching, currency selector listeners

**Backend Route/Handler Layer:**
- Purpose: HTTP endpoint definitions, request validation, response formatting
- Location: `backend/index.js` (all routes defined inline)
- Contains: ~50+ endpoints (GET /allproducts, POST /addtocart, POST /orders, admin routes, file serving)
- Depends on: Model layer, middleware (auth, rate limiting), external services (PayPal, Stripe, DigitalOcean)
- Used by: Frontend API calls, external webhooks (PayPal, Stripe)

**Backend Middleware Layer:**
- Purpose: Request preprocessing - authentication, rate limiting, error handling
- Location: `backend/middleware/auth.js`
- Contains: JWT token verification (fetchUser), password-based login (authUser), admin role check (requireAdmin), token extraction (getTokenFromRequest)
- Depends on: jsonwebtoken, bcrypt, User model
- Used by: Protected routes apply fetchUser/requireAdmin before handlers

**Backend Model/Schema Layer:**
- Purpose: MongoDB schema definition, data validation
- Location: `backend/models/User.js`, `backend/models/Product.js`, `backend/models/Settings.js`, exported via `backend/models/index.js`
- Contains: Mongoose schemas with field definitions, indexes, validation rules
- Depends on: Mongoose, MongoDB connection
- Used by: All route handlers for CRUD operations, services

**Backend Service Layer:**
- Purpose: Business logic for external integrations and scheduled tasks
- Location: `backend/services/exchangeRateService.js`, `backend/jobs/exchangeRateJob.js`
- Contains: Exchange rate fetching and caching, scheduled updates via node-cron
- Depends on: External exchange rate API, database
- Used by: Route handlers for currency conversion, checkout calculations

**Backend Config Layer:**
- Purpose: Environment setup, database connection, locale detection, middleware initialization
- Location: `backend/config/db.js`, `backend/config/locale.js`
- Contains: MongoDB URI parsing, GeoIP-based locale detection (resolveRequestLocale), connection management
- Depends on: dotenv, mongoose, geoip-lite
- Used by: index.js during app initialization

**File Storage Layer:**
- Purpose: Image upload and serving (DigitalOcean Spaces in prod, local filesystem in dev)
- Location: Inline handlers in `backend/index.js` (POST /product-image-upload, etc.), uses multer for upload, sharp for image processing
- Contains: Upload handlers with validation, image resizing, CDN URL generation, fallback local serving
- Depends on: AWS SDK (S3-compatible), Sharp, multer, filesystem
- Used by: Admin dashboard for product images, frontend for display

## Data Flow

**User Page Load:**
1. Browser loads `frontend/index.html`
2. Parcel bundles and loads `frontend/js/controller.js` as module script
3. Controller calls `bootstrapLocaleSync()` to set language from localStorage (fallback browser/timezone detection)
4. Document HTML lang/dir set based on detected locale (eng=en/ltr, heb=he/rtl)
5. On window load, appropriate view control function invoked (e.g., controlHomePage)
6. View calls `model.handleLoadStorage()` to fetch cart from API (if logged in) or localStorage
7. View calls `setLanguage()` and page-specific language setup, renders page-specific UI

**Product Fetch (e.g., Categories View):**
1. User navigates to categories page
2. Controller instantiates categoriesView, calls control function
3. View fetches `GET /allproducts` or `POST /productsByCategory` from backend
4. Backend handler queries Product collection, returns JSON with prices in base currency
5. Frontend View receives data, creates HTML with current currency selector value
6. When user changes currency, custom event dispatched, prices updated via frontend logic (conversion in model.js or calculation)

**Cart Operations:**
1. User adds/removes item from cart
2. View calls model.addToCart or model.removeFromCart
3. Model pushes to local cart array
4. If user is authenticated (auth-token in localStorage), POST to `/addtocart` or `/removefromcart` with fetchUser middleware
5. Backend updates User.cart in MongoDB, returns updated cart
6. Frontend updates UI, persists to localStorage and/or syncs with model.cart

**Authentication:**
1. User submits login via (removed per CLAUDE.md, but structure preserved)
2. Backend `POST /login` or `POST /signup` handler authenticates via authUser middleware (bcrypt compare)
3. Backend generates JWT token with `{ user: { id } }` payload, returns to frontend
4. Frontend stores token in localStorage as 'auth-token'
5. Subsequent API calls include header: `auth-token: <token>`
6. Protected endpoints verify token with fetchUser middleware before accessing req.user

**Checkout Flow:**
1. User submits order from cart
2. Frontend `POST /orders` with cart contents, user email, payment method
3. Backend handler validates cart items, calculates totals with exchange rate conversion
4. Creates PayPal/Stripe order via external APIs, stores Order document
5. Returns payment URL or Stripe session to frontend
6. Frontend redirects to payment gateway
7. Payment gateway redirects back to webhook endpoint (`POST /webhook`) or return URL
8. Backend webhook updates Order status, clears user cart if successful

**State Management:**
- Frontend: localStorage (language, currency, auth-token, cart for guests), model.cart array (in-memory), view._data (temporary render data)
- Backend: MongoDB (Users, Products, Orders, Settings), redis cache (not detected - no caching layer), in-memory exchange rates

## Key Abstractions

**View Class Hierarchy:**
- Purpose: Encapsulate DOM manipulation, language/currency handling, common UI patterns
- Examples: `frontend/js/View.js` (base), `frontend/js/Views/homePageView.js`, `frontend/js/Views/cartView.js`, etc.
- Pattern: Base View class defines shared methods (setLanguage, changeToHeb, toggleCategoriesList, setupMenuHandler); page-specific views extend and override

**Model API Interface:**
- Purpose: Abstract fetch calls and storage operations behind functions
- Examples: `model.handleLoadStorage()`, `model.checkCartNumber()`, `model.addToCart(item)`
- Pattern: Exported async functions that handle fetch logic, error handling, storage persistence

**Mongoose Schema Abstraction:**
- Purpose: Define data structure, validation, and relationship to MongoDB
- Examples: `backend/models/User.js` (email, password, cart, userType), `backend/models/Product.js` (name, price_usd, price_ils, category, images)
- Pattern: Mongoose schema with methods and middleware; indexed fields for common queries

**Express Middleware Stack:**
- Purpose: Common cross-cutting concerns applied to groups of routes
- Examples: `authRateLimiter` (rate limiting by IP), `fetchUser` (JWT verification), `requireAdmin` (role check), CORS/helmet (security)
- Pattern: Middleware functions in array, applied via app.use() or specific route app.get/post(path, middleware, handler)

**Payment Gateway Integration:**
- Purpose: Abstract PayPal/Stripe creation and webhook handling
- Examples: PayPal Client SDK in backend, Stripe SDK for charge/session creation
- Pattern: Backend handlers receive payment credentials from env, expose endpoints for frontend to trigger payments, webhooks validate and update orders

## Entry Points

**Frontend SPA Entry:**
- Location: `frontend/index.html` (script tag: `<script type="module" src="./js/controller.js" defer></script>`)
- Triggers: Page load, Parcel module system executes controller.js
- Responsibilities: Initialize locale, set up event listeners for navigation, instantiate views on page change, handle browser history (if router implemented)

**Backend Server Entry:**
- Location: `backend/index.js` (module.exports = app, run via `npm start` or `npm run devStart`)
- Triggers: Node process start, monolithic entry point
- Responsibilities: Initialize Express app, apply middleware stack, define all routes, connect to MongoDB, start scheduled jobs (exchangeRateJob), listen on PORT

**Admin Dashboard Entry:**
- Location: `admin/index.html` (no js/ folder visible; likely single BisliView.js file)
- Triggers: Direct navigation to admin URL or login flow
- Responsibilities: Render admin interface for product/order management, call backend admin endpoints (protected by requireAdmin middleware)

## Error Handling

**Strategy:** Try-catch blocks at handler level, middleware catches unhandled errors, frontend logs to console/localStorage, backend returns JSON errors with status codes.

**Patterns:**
- Backend: Route handlers wrap async code in try-catch, return `res.status(4xx).json({ success: false, errors: 'message' })`
- Frontend: Model functions use try-catch in async handlers, console.error on failure, don't propagate errors (catch silently or fallback to empty state)
- Authentication: fetchUser middleware returns 401 for missing/invalid token, 403 for insufficient role
- Rate limiting: Requests exceeding limit get 429 Too Many Requests
- File upload: Validation checks file type/size before processing, returns 400 if invalid
- Payment: External API errors caught and returned with helpful message to frontend

## Cross-Cutting Concerns

**Logging:**
- Frontend: console.log/error used throughout (no structured logging), visible in browser DevTools
- Backend: console.log/error used, agentLog function sends debug payloads to external service (disabled in prod likely)
- No centralized logging service detected (Sentry, DataDog, etc.)

**Validation:**
- Frontend: HTML form validation (required, type attributes), no schema validation detected
- Backend: Manual validation in handlers (check for required fields, type checking), no library like joi/zod
- Models: Mongoose provides basic schema validation (required fields)

**Authentication:**
- Frontend: JWT token persisted in localStorage, included as header on API calls
- Backend: fetchUser middleware extracts and verifies token via jsonwebtoken.verify()
- No refresh token rotation; token is valid indefinitely (security risk noted)
- Admin: requireAdmin middleware checks userType === 'admin'

**Internationalization (i18n):**
- Frontend: Language selected via dropdown, persisted to localStorage as 'language' (eng/heb)
- Backend: localeMiddleware detects via GeoIP headers (x-forwarded-for), sets response locale hint
- CSS: Separate stylesheets per breakpoint and language (home-800plus.css, home-devices.css, RTL via conditional classes)
- HTML: Dual HTML structures (ul-heb, ul-eng) with display:none switching based on language selection

**Currency Conversion:**
- Frontend: Currency selector (USD/ILS) persisted to localStorage, views apply via hardcoded or exchange-rate multiplier
- Backend: exchangeRateService fetches daily USD-to-ILS rate from external API, caches in database Settings collection
- Routes: Handlers return both usd_price and ils_price fields in Product responses (denormalized storage)
- On checkout: Total calculated with current exchange rate from Settings

---

*Architecture analysis: 2026-01-31*
