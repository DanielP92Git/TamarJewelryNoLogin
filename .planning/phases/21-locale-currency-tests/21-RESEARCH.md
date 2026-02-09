# Phase 21: Locale & Currency Tests - Research Findings

**Researched:** 2026-02-09
**Status:** Ready for planning

## What Do I Need to Know to PLAN This Phase Well?

### 1. Architecture Overview

#### Frontend Locale System
The app has TWO locale-related modules:
1. **`frontend/js/locale.js`** - New module handling GeoIP detection and backend hydration
2. **`frontend/js/View.js`** - Existing module handling UI language/currency switching

**Key insight:** Phase 19 already tested View.js extensively. Phase 21 should focus on locale.js + verifying LOCALE requirements not yet covered.

#### How Locale Works
```
Page Load Flow:
1. controller.js calls bootstrapLocaleSync() IMMEDIATELY (line 18)
   - Reads localStorage for existing language/currency
   - If missing, guesses from browser (navigator.language, Intl.timeZone)
   - Sets localStorage + document.documentElement.lang/dir
   - Tracks what was auto-filled via window.__localeAuto flag

2. controller.js calls hydrateLocaleFromBackend() asynchronously (line 222)
   - Only runs if user had NO preference at page start
   - Fetches /api/locale (falls back to /locale)
   - Backend returns GeoIP data: { ok: true, country, lang, currency, appLang, appCurrency }
   - Only overrides if window.__localeAuto.langWasMissing or currencyWasMissing
   - Dispatches 'currency-changed' CustomEvent for View re-renders

3. View.js event delegation listens for user changes
   - Currency selector changes trigger localStorage updates + CustomEvent dispatch
   - Language flag clicks call changeToHeb()/changeToEng()
```

#### Backend Endpoint
- **Route:** `app.get(['/api/locale', '/locale'], ...)`
- **Location:** `backend/index.js:1116`
- **Logic:** `backend/config/locale.js` - GeoIP via headers (Cloudflare, Vercel, etc.) or geoip-lite
- **Fallback chain:** Cookie preference → CDN headers → geoip-lite(IP) → default (US/English)
- **Response format:**
```json
{
  "ok": true,
  "country": "IL",
  "lang": "he",
  "currency": "ILS",
  "appLang": "heb",
  "appCurrency": "ils"
}
```

### 2. What Phase 19 and 20 Already Tested

#### Phase 19 (Base View Tests) - 82 tests
**VIEW-01 to VIEW-04:** Language selector and RTL switching
- ✅ Language selector renders with flag icons (desktop + mobile)
- ✅ Language switches update localStorage ('language' key)
- ✅ document.documentElement.lang updates ('en' / 'he')
- ✅ document.documentElement.dir updates ('ltr' / 'rtl')
- ✅ changeToHeb() and changeToEng() methods work
- ✅ Menu text updates (Hebrew vs English navigation labels)

**VIEW-05 to VIEW-08:** Currency selector
- ✅ Currency selector renders with USD/ILS options
- ✅ Currency switches update localStorage ('currency' key)
- ✅ Currency changes dispatch 'currency-changed' CustomEvent
- ✅ Event delegation works across menu re-renders
- ✅ Hebrew currency selector has dir="rtl" attribute
- ✅ Currency labels translate (Hebrew: מטבע, דולר, שקל)

**VIEW-09 to VIEW-11:** Header menu and cleanup
- ✅ Menu renders navigation links
- ✅ Menu state updates on navigation
- ✅ Event listeners cleaned up on unmount

#### Phase 20 (Page View Tests) - 72 tests
**PAGE-03, PAGE-07:** Currency display in views
- ✅ Cart displays prices with $ symbol for USD
- ✅ Cart displays prices with ₪ symbol for ILS
- ✅ Currency switching re-renders cart prices (via 'currency-changed' event)
- ✅ Both usdPrice and ilsPrice fields stored in cart items
- ✅ Checkout always uses USD prices for Stripe (regardless of display currency)

**Key finding:** Phase 20 tests verify that currency switching updates all cart items (LOCALE-07) and maintains quantities (LOCALE-08) through the CartView currency-changed listener.

### 3. Coverage Analysis: What's Left for Phase 21?

#### Already Covered by Phase 19/20
- ✅ **LOCALE-01:** RTL layout applies when Hebrew selected (VIEW-04: dir="rtl")
- ✅ **LOCALE-02:** LTR layout applies when English selected (VIEW-04: dir="ltr")
- ✅ **LOCALE-04:** Currency display uses $ symbol for USD (PAGE-03)
- ✅ **LOCALE-05:** Currency display uses ₪ symbol for ILS (PAGE-03)
- ✅ **LOCALE-07:** Price recalculation updates all cart items (PAGE-03: currency-changed event)
- ✅ **LOCALE-08:** Price recalculation maintains quantity (PAGE-03: verified in cart tests)
- ✅ **LOCALE-09:** Translation text updates when language switches (VIEW-02, VIEW-03: menu text)

#### Needs Testing in Phase 21
- ⚠️ **LOCALE-03:** RTL layout changes flex-direction correctly
  - **Gap:** Happy-DOM doesn't apply CSS - cannot verify flex-direction computed styles
  - **Decision:** Test that dir="rtl" attribute is set (trigger), document limitation in comments
  - **Status:** Partially covered by VIEW-04, needs explicit LOCALE-03 documentation

- 🆕 **LOCALE-06:** Currency formatting shows correct decimal places (2 for both)
  - **Gap:** No explicit tests for decimal formatting
  - **Finding:** Code uses `Math.round()` everywhere - prices are stored/displayed as INTEGERS
  - **Evidence:** `cartView.js:31,38,41`, `currency.test.js:83-84`
  - **Decision:** Document that app uses whole numbers, no decimals shown to users

- 🆕 **LOCALE-10:** Bidirectional text handles Hebrew names + English SKUs correctly
  - **Finding:** One bidi attribute found in `categoriesView.js:627`: `<span class="sku-value" dir="ltr">`
  - **Implementation:** SKU values (English codes) explicitly set to LTR even in Hebrew mode
  - **Decision:** Test that SKU elements have dir="ltr" in Hebrew product cards

- 🆕 **LOCALE-11:** GeoIP detection determines initial locale from headers
  - **Target:** Test `fetchLocaleFromBackend()` in locale.js
  - **Mock:** Fetch returns `{ ok: true, country: "IL", appLang: "heb", appCurrency: "ils" }`
  - **Verify:** localStorage updates if values were missing

- 🆕 **LOCALE-12:** GeoIP fallback chain works when detection fails
  - **Target:** Test `/api/locale` primary, `/locale` fallback logic
  - **Also:** Test `guessLocaleFromBrowser()` when fetch fails
  - **Also:** Test 900ms timeout behavior

- 🆕 **LOCALE-13:** Locale preference persists to localStorage
  - **Partially covered:** Phase 19 tests localStorage.setItem('language'/'currency')
  - **Gap:** No tests for `bootstrapLocaleSync()` initial persistence
  - **Decision:** Add tests for bootstrapLocaleSync() writing to localStorage

- 🆕 **LOCALE-14:** Locale preference loads from localStorage on page reload
  - **Partially covered:** Phase 19 verifies localStorage reads in View.js
  - **Gap:** No tests for `bootstrapLocaleSync()` reading existing values and preserving them
  - **Decision:** Test that existing localStorage values are NOT overwritten by bootstrap

### 4. Locale.js Functions to Test

```javascript
// Export functions (testable via direct import)
bootstrapLocaleSync()          // Called on page load, sets defaults
hydrateLocaleFromBackend()     // Async, fetches GeoIP, respects prefs
applyDocumentLanguageFromStorage() // Helper for document.documentElement updates

// Internal functions (test through exports)
normalizeAppLanguage(value)    // Validates 'eng' | 'heb'
normalizeAppCurrency(value)    // Validates 'usd' | 'ils'
mapIsoToApp({ lang, currency, appLang, appCurrency }) // Maps ISO codes to app keys
guessLocaleFromBrowser()       // navigator.language + Intl.timeZone detection
setDocumentLanguage(appLang)   // Sets document.documentElement.lang/dir
fetchLocaleFromBackend(timeoutMs) // Fetch with abort controller + fallback
getApiBase()                   // Returns window.location.origin or process.env.API_URL
```

### 5. Key Testing Patterns from Prior Phases

#### From Phase 17 (Infrastructure)
- Happy-DOM 20.0.11 configured
- localStorage cleanup via `setup.js`
- @testing-library/dom for semantic queries

#### From Phase 19 (View Tests)
```javascript
// Minimal DOM fixture for View instantiation
render(`
  <header></header>
  <div class="menu"></div>
  <div data-purpose="header-utilities"></div>
  <div class="footer"></div>
`);

// Currency persistence flag cleanup
afterEach(() => {
  delete window.__currencyPersistenceInitialized;
});

// Wait for async setLanguage
await new Promise(resolve => setTimeout(resolve, 100));
```

#### From Phase 18 (Model Tests)
```javascript
// Fetch mocking pattern
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ ok: true, data: {...} })
  })
);

// AbortController mock (for timeout tests)
vi.stubGlobal('AbortController', class {
  signal = {};
  abort() {}
});
```

### 6. Decimal Formatting Discovery

**LOCALE-06 requires "2 decimal places for both currencies."**

**Evidence from codebase:**
- `cartView.js:31,38,41,48` - All prices use `Math.round()` (integers)
- `currency.test.js:83-84` - Tests verify integer rounding: `49.99 → 50`, `184.96 → 185`
- `cart.test.js:176,204` - Tests check textContent contains '$50' and '₪185' (no decimals)

**Conclusion:** The app stores and displays prices as whole numbers. No decimal places shown.

**Decision for LOCALE-06:**
- Mark as **N/A** with justification: "App uses integer prices (Math.round), no decimal display"
- OR test "0 decimal places consistently" as the actual behavior
- **Recommendation:** Document this as a known deviation and test the actual behavior (integers)

### 7. Translation Mechanism (LOCALE-09)

**Finding:** Translations are hard-coded in View methods, not loaded from JSON files.

**Evidence:**
- `cartView.js:102-115` - `setCartLng()` method has if/else for 'eng'/'heb'
- `View.js:695-800` - `setLanguage()` method builds menu HTML with conditional text
- No translation JSON files found in codebase

**Conclusion:** Phase 19 already tested translation updates (menu text changes). No additional LOCALE-09 tests needed beyond what VIEW-02/VIEW-03 cover.

### 8. Bidirectional Text (LOCALE-10)

**Finding:** Minimal bidi handling exists.

**Evidence:**
- `categoriesView.js:627` - SKU spans have `dir="ltr"` to force English SKU codes left-to-right
- No `<bdi>` or `<bdo>` elements found
- Product titles in Hebrew render without explicit bidi markup

**Current behavior:**
- SKU codes (English) explicitly set LTR even in Hebrew mode
- Hebrew product names render in RTL via document.documentElement.dir="rtl"
- No special handling for mixed Hebrew/English text within single strings

**Decision for LOCALE-10:**
- Test that SKU elements have `dir="ltr"` attribute in Hebrew mode
- Document limitation: No `<bdi>` elements for mixed-direction inline text
- This is acceptable for v1.3 - SKU codes are separate UI elements

### 9. Backend Test Coverage (v1.2)

**Research question:** Does v1.2 already test backend locale endpoint?

**Findings from git log/STATE.md:**
- v1.2 had 7 phases (10-16): Auth, Payments, Currency, Upload, Database, Security
- Phase 13 (Currency Tests) tested exchange rate service, not locale detection
- Backend locale endpoint (`/api/locale`, `/locale`) appears UNTESTED

**Decision:** Phase 21 focuses on frontend locale.js module. Backend endpoint testing is out of scope (would belong in future backend locale test phase).

### 10. Test File Structure Recommendation

Based on patterns from Phase 19/20 and locale.js structure:

```
frontend/tests/locale/
├── bootstrap.test.js          # LOCALE-13, LOCALE-14, LOCALE-06
│   - bootstrapLocaleSync() initial load
│   - localStorage persistence
│   - Browser guess fallback
│   - Integer price formatting validation
│
├── hydration.test.js          # LOCALE-11, LOCALE-12
│   - hydrateLocaleFromBackend() GeoIP fetch
│   - Fallback chain (/api/locale → /locale)
│   - 900ms timeout handling
│   - Respects existing user preferences
│   - currency-changed event dispatch
│
├── helpers.test.js            # Supporting functions
│   - normalizeAppLanguage/Currency
│   - mapIsoToApp
│   - guessLocaleFromBrowser
│   - setDocumentLanguage
│
└── bidi.test.js               # LOCALE-10
    - SKU elements have dir="ltr" in Hebrew mode
    - Integration test with categoriesView
```

### 11. Requirements Status Summary

| Req | Description | Status | Notes |
|-----|-------------|--------|-------|
| LOCALE-01 | RTL layout applies (Hebrew) | ✅ Phase 19 | VIEW-04: dir="rtl" |
| LOCALE-02 | LTR layout applies (English) | ✅ Phase 19 | VIEW-04: dir="ltr" |
| LOCALE-03 | RTL flex-direction | ⚠️ Partial | Happy-DOM limitation, test dir attribute |
| LOCALE-04 | Currency $ symbol | ✅ Phase 20 | PAGE-03: cart tests |
| LOCALE-05 | Currency ₪ symbol | ✅ Phase 20 | PAGE-03: cart tests |
| LOCALE-06 | Decimal places (2) | ⚠️ Deviation | App uses integers (0 decimals) |
| LOCALE-07 | Price recalc updates items | ✅ Phase 20 | PAGE-03: currency-changed |
| LOCALE-08 | Price recalc keeps quantity | ✅ Phase 20 | PAGE-03: cart state |
| LOCALE-09 | Translation updates | ✅ Phase 19 | VIEW-02/03: menu text |
| LOCALE-10 | Bidi text (Hebrew + SKU) | 🆕 Phase 21 | Test SKU dir="ltr" |
| LOCALE-11 | GeoIP detection | 🆕 Phase 21 | Test fetchLocaleFromBackend |
| LOCALE-12 | GeoIP fallback chain | 🆕 Phase 21 | Test primary→fallback→guess |
| LOCALE-13 | Locale persists | 🆕 Phase 21 | Test bootstrapLocaleSync writes |
| LOCALE-14 | Locale loads on reload | 🆕 Phase 21 | Test bootstrap preserves existing |

**Coverage:**
- Already tested: 8/14 (57%)
- Needs testing: 4/14 (29%)
- Deviations: 2/14 (14%)

### 12. Risk Assessment & Testing Strategy

#### High Priority (Critical Paths)
1. **bootstrapLocaleSync()** - Runs on EVERY page load, must preserve user prefs
2. **hydrateLocaleFromBackend()** - GeoIP logic affects new users, must not clobber prefs
3. **Decimal formatting** - Requirement deviation needs explicit documentation

#### Medium Priority (User Experience)
4. **Bidirectional text** - SKU handling affects product display
5. **Fallback chain** - Timeout/network failures should degrade gracefully

#### Low Priority (Edge Cases)
6. **Browser guess** - Fallback for when fetch fails (rare in production with CDN)
7. **900ms timeout** - Performance optimization, not critical for correctness

### 13. Happy-DOM Limitations

**Known gaps (accepted):**
1. **CSS not applied** - Cannot test flex-direction computed styles (LOCALE-03)
2. **No visual testing** - Cannot verify actual RTL layout rendering
3. **No IntersectionObserver** - Cannot test lazy-load behaviors

**Mitigation:**
- Test DOM attributes (dir="rtl") as triggers
- Document gaps in test file comments
- Consider Playwright visual regression tests for future milestone

### 14. Key Code Locations

#### Frontend
- `frontend/js/locale.js` - Main locale module (199 lines)
- `frontend/js/controller.js:3,18,222` - Locale initialization calls
- `frontend/js/View.js:1-79` - Currency persistence module-level code
- `frontend/js/View.js:552-596` - changeToHeb/changeToEng methods
- `frontend/js/Views/categoriesView.js:627` - Bidi SKU handling

#### Backend
- `backend/config/locale.js` - GeoIP resolution logic (122 lines)
- `backend/index.js:1116` - `/api/locale` and `/locale` endpoint

#### Tests (existing)
- `frontend/tests/view/language.test.js` - VIEW-01 to VIEW-04
- `frontend/tests/view/currency.test.js` - VIEW-05 to VIEW-08
- `frontend/tests/views/cart.test.js` - PAGE-03 currency display

### 15. Environment Variables

From `backend/env.example`:
- API_URL - Used by locale.js getApiBase() fallback
- No locale-specific env vars (GeoIP uses runtime headers)

From frontend code:
- `process.env.API_URL` - Read by locale.js:77
- `process.env.NODE_ENV` - Used for dev warnings (locale.js:183)

### 16. Dependencies

**Production:**
- None new (uses native fetch, localStorage, navigator, Intl)

**Backend (not tested in Phase 21):**
- `geoip-lite` - Optional dependency for IP lookup (backend/config/locale.js:64)

**Test:**
- Vitest 4.0.18
- Happy-DOM 20.0.11
- @testing-library/dom 10.4.1

### 17. Integration Points

**Locale.js integrates with:**
1. **localStorage** - Reads/writes 'language' and 'currency' keys
2. **document.documentElement** - Sets lang and dir attributes
3. **window events** - Dispatches 'currency-changed' CustomEvent
4. **Backend API** - Fetches /api/locale or /locale
5. **View.js** - Consumed by currency selector event delegation
6. **Controller.js** - Called at app startup (bootstrapLocaleSync, hydrateLocaleFromBackend)

**Test isolation strategy:**
- Mock fetch for backend calls
- Mock window.location.origin for getApiBase()
- Mock navigator.language and Intl for browser guess
- Mock setTimeout/clearTimeout for timeout tests
- Use vi.useFakeTimers() for 900ms timeout verification

### 18. Success Criteria Verification

**From phase description:**
1. RTL layout applies correctly when Hebrew selected
   - ✅ Already verified by Phase 19 (dir="rtl")
   - 🆕 Add explicit LOCALE-03 test for attribute presence

2. Currency symbols display correctly ($ for USD, ₪ for ILS)
   - ✅ Already verified by Phase 20
   - No additional tests needed

3. Price recalculation updates all cart items when currency switches
   - ✅ Already verified by Phase 20 (currency-changed event)
   - No additional tests needed

4. Translation text updates when language switches
   - ✅ Already verified by Phase 19 (menu text changes)
   - No additional tests needed

5. Locale preferences persist to localStorage and load on page reload
   - 🆕 Test bootstrapLocaleSync() persistence (LOCALE-13)
   - 🆕 Test bootstrapLocaleSync() respects existing values (LOCALE-14)

**Additional verification needed:**
- Decimal formatting documentation (LOCALE-06)
- Bidirectional text handling (LOCALE-10)
- GeoIP detection (LOCALE-11, LOCALE-12)

### 19. Testing Approach: Avoid Duplication

**Phase 21 should NOT duplicate:**
- Language selector UI tests (Phase 19)
- Currency selector UI tests (Phase 19)
- Cart price display tests (Phase 20)
- Menu translation tests (Phase 19)

**Phase 21 SHOULD add:**
- locale.js module-level unit tests
- bootstrapLocaleSync() behavior
- hydrateLocaleFromBackend() behavior
- GeoIP fetch and fallback logic
- Browser guess fallback
- __localeAuto flag mechanism
- SKU bidirectional text handling

**Estimated test count:** ~35-45 tests across 4 test files

### 20. Open Questions for Planning

1. **LOCALE-06 (Decimal places):** Test actual behavior (0 decimals) or mark as N/A with deviation note?
   - **Recommendation:** Test 0 decimals as actual behavior, document deviation from requirement

2. **900ms timeout:** Worth testing or skip as low-value?
   - **Recommendation:** Test it - uses AbortController, good coverage for edge case

3. **Backend endpoint tests:** In scope for Phase 21 or defer?
   - **Recommendation:** Defer - focus on frontend locale.js module

4. **Bidi integration test:** Test SKU handling in isolation or via categoriesView?
   - **Recommendation:** Both - unit test for SKU markup, integration test with actual product card

5. **LOCALE-03 flex-direction:** Mark as N/A or test dir attribute as proxy?
   - **Recommendation:** Test dir="rtl" attribute, document CSS limitation in comments

---

## Summary: What Matters Most for Planning

### Core Focus
**Test locale.js module functions that aren't covered by Phase 19/20.**

### New Test Files Needed
1. `bootstrap.test.js` - Initial locale loading and persistence
2. `hydration.test.js` - GeoIP backend fetch and fallback chain
3. `helpers.test.js` - Utility function unit tests
4. `bidi.test.js` - Bidirectional text handling

### Requirements Split
- **8 requirements** already tested by Phase 19/20
- **4 requirements** need new tests in Phase 21
- **2 requirements** need documentation of deviations

### Key Behaviors to Verify
1. **bootstrapLocaleSync()** preserves existing prefs, sets defaults for missing
2. **hydrateLocaleFromBackend()** only overrides auto-filled values
3. **GeoIP fallback** works: /api/locale → /locale → browser guess
4. **SKU elements** have dir="ltr" in Hebrew mode
5. **Integer pricing** consistently used (document LOCALE-06 deviation)

### Testing Strategy
- Direct unit tests of locale.js exports
- Mock fetch for backend calls
- Mock browser APIs (navigator, Intl) for guess fallback
- One integration test with categoriesView for bidi
- Document Happy-DOM CSS limitation for LOCALE-03

### Estimated Scope
- **Test files:** 4
- **Test cases:** 35-45
- **Duration:** Similar to Phase 19 (~3 plans, ~1.5 hours)

---

*Research complete. Ready for plan creation.*
