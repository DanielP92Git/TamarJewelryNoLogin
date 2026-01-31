# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- `camelCase.js` for regular modules (e.g., `model.js`, `controller.js`, `locale.js`, `cartView.js`)
- `PascalCase.js` for classes/main exports (e.g., `View.js`, `CartView.js`)
- Service files: `{name}Service.js` (e.g., `exchangeRateService.js`)
- Middleware: `{name}.js` in `/backend/middleware/` (e.g., `auth.js`)
- Models: `index.js` or singular names (e.g., `/backend/models` exports `Users`, `Product`, `Settings`)
- Config: `{name}.js` in `/backend/config/` (e.g., `db.js`, `locale.js`)
- View classes: `{FeatureName}View.js` (e.g., `cartView.js`, `homePageView.js`, `categoriesView.js`)

**Functions:**
- `camelCase` for all function names
- Async functions: `const name = async function()` or `const name = async (params) =>`
- Event handlers: `{verb}{Subject}Handler` or `handle{Subject}` (e.g., `addCartViewHandler`, `handleAddToCart`)
- Private methods in classes: Prefix with `_` (e.g., `_getCurrentCurrency()`, `_getItemPrice()`)
- Utility functions: `verb{Noun}` (e.g., `normalizeBaseUrl()`, `getSpacesPublicBaseUrl()`)

**Variables:**
- `camelCase` for all variables
- Constants: `UPPER_SNAKE_CASE` (e.g., `CURRENCY_STORAGE_KEY`, `API_URL`, `DEFAULT_EXCHANGE_RATE`)
- Private class fields: Prefix with `_` (e.g., `_data`, `_parentElement`, `_host`)
- Boolean variables: `is{Adjective}` or `{verb}ed` (e.g., `isHebrew`, `isRateStale`, `_currencyListenerAdded`)

**Types/Classes:**
- `PascalCase` for classes (e.g., `View`, `CartView`, `AboutView`)
- Destructuring: `const { field1, field2 } = object`
- API response fields: `snake_case` from backend (e.g., `usd_ils_rate`, `exchange_rate_last_updated`)
- Model fields: `snake_case` (e.g., `userType`, `_id`, `auth-token`)

## Code Style

**Formatting:**
- Prettier for automatic formatting (no additional rules enforced)
- Config: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\.prettierrc` and `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\.prettierrc`
- Settings:
  - `singleQuote: true` - Use single quotes instead of double quotes
  - `arrowParens: 'avoid'` - Arrow functions without parens when possible (e.g., `x => x + 1`)

**Linting:**
- ESLint with `@eslint/js` recommended config
- Config files:
  - Backend: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\eslint.config.mjs`
  - Frontend: `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\eslint.config.mjs`
- Languages: CommonJS (backend), ES modules (frontend)
- Globals: Both browser and Node globals supported

**Indentation:**
- 2-space indentation (enforced by Prettier)
- No tabs

**Semicolons:**
- Always use semicolons (Prettier default)

**Quotes:**
- Single quotes required by Prettier configuration

## Import Organization

**Order:**
1. Node.js built-ins (`path`, `fs`, `http`, etc.)
2. Third-party packages (`express`, `mongoose`, `dotenv`, etc.)
3. Local modules (relative imports)
4. SVG imports (for frontend icons)

**Pattern - Backend (CommonJS):**
```javascript
// Example from C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { connectDb } = require('./config/db');
const { Users, Product, Settings } = require('./models');
const { getTokenFromRequest, authUser } = require('./middleware/auth');
```

**Pattern - Frontend (ES Modules):**
```javascript
// Example from C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\Views\cartView.js
import View from '../View.js';
import * as model from '../model.js';
import deleteSvg from '../../imgs/svgs/x-solid.svg';
require('dotenv').config();
```

**Path Aliases:**
- Not currently used in this codebase
- Imports use relative paths (`../`, `./`)

## Error Handling

**Patterns:**
- Always wrap async operations in `try-catch` blocks
- Use nested try-catch for critical multi-step operations
- Catch clauses may use empty destructuring `catch {}` to silently ignore non-critical errors
- Always log errors with context information

**Common Pattern - Graceful Degradation:**
```javascript
// From C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\locale.js
try {
  const origin = window?.location?.origin;
  if (origin && typeof origin === 'string') return origin;
} catch {
  // ignore - fall back to next option
}
```

**Common Pattern - Validation & Throw:**
```javascript
// From C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\services\exchangeRateService.js
if (!Number.isFinite(rate) || rate <= 0) {
  throw new Error(`Invalid rate value: ${rate}`);
}
```

**Common Pattern - API Error Responses:**
```javascript
// From C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\middleware\auth.js
if (!token) {
  return res.status(401).json({
    success: false,
    errors: 'Please authenticate using valid token',
  });
}
```

**Logging:**
- Use `console.error()` for actual errors
- Use `console.log()` for informational messages
- Use `console.warn()` for fallback/degraded behavior
- Include context in messages (e.g., `[CartView]` prefix for view-specific logs)
- Never log sensitive data (passwords, tokens, keys) in production

**Error Types:**
- Backend returns JSON: `{ success: false, errors: 'message' }` or `{ errors: 'message' }`
- HTTP status codes: 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- Custom error codes: Stored on error object (e.g., `err.code = 'SPACES_NOT_CONFIGURED'`)

## Logging

**Framework:** `console` (no external logging library)

**Patterns:**
- Development: More verbose logs for debugging
- Production: Minimal logs, filtered by `NODE_ENV` checks
- Example from `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js`:
  ```javascript
  if (process.env.NODE_ENV !== 'production') {
    console.log('Authenticated successfully');
  }
  ```

**Log Levels Used:**
- `console.log()` - Informational/debug messages
- `console.error()` - Error conditions that need attention
- `console.warn()` - Warnings, degraded behavior, fallbacks
- No special prefixes required, but view classes may prefix with `[ViewName]`

## Comments

**When to Comment:**
- Complex algorithms or business logic
- Non-obvious workarounds or temporary solutions
- Section dividers for organizational clarity
- Parameter/return explanations for public functions

**Section Dividers:**
- Use comment blocks for major sections: `// =============================================`
- Use `// #region` and `// #endregion` for collapsible sections (IDE support)
- Example from `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js`:
  ```javascript
  // #region agent log
  function agentLog(hypothesisId, location, message, data) {
    // implementation
  }
  // #endregion
  ```

**JSDoc/TSDoc:**
- Used for service functions and utility modules
- Include `@param` and `@returns` documentation
- Example from `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\services\exchangeRateService.js`:
  ```javascript
  /**
   * Exchange Rate Service
   * Handles fetching, storing, and retrieving USD to ILS exchange rates
   */

  /**
   * Fetches the current USD to ILS exchange rate from external API
   * @returns {Promise<{rate: number, source: string}>} Exchange rate and source
   */
  async function fetchCurrentRate() {
    // implementation
  }
  ```

**Removed Code:**
- Commented-out code is present but should be deleted before committing (e.g., old commented functions in `model.js`)
- Use git history instead of comments for old implementations

## Function Design

**Size:**
- Keep functions under 50 lines when possible
- Break complex logic into smaller helper functions
- Example: Backend image processing uses separate `processImage()` and utility helpers

**Parameters:**
- Destructure object parameters for clarity: `function handle({ lng, data })`
- Arrow functions for short callbacks: `(arr) => arr.map(x => x + 1)`
- Use `function` keyword for longer async operations or middleware
- Max 3-4 parameters; use object destructuring for more

**Return Values:**
- Always return values from functions that compute results
- Promise-based (async): Return `Promise<Type>` with JSDoc
- Event handlers: May return `undefined` or `void`
- Async handlers: Return promise even if no value needed (for chaining)

**Example - Async Function with Error Handling:**
```javascript
// From C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\middleware\auth.js
const authUser = async function (req, res, next) {
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
      // validation logic
      bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (err || !result) {
          return res.status(401).json({ success: false, errors: 'Auth Failed' });
        }
        req.user = user;
        next();
      });
    } else {
      res.status(404).json({ errors: 'No user found...' });
    }
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ errors: 'Auth User - Internal Server Error' });
  }
};
```

## Module Design

**Exports:**
- Backend: Use `module.exports = { func1, func2, Class }` (CommonJS)
- Frontend: Use `export const func = ...` and `export default Class` (ES modules)
- Example from `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\services\exchangeRateService.js`:
  ```javascript
  module.exports = {
    fetchCurrentRate,
    getStoredRate,
    updateRate,
    getExchangeRate,
    isRateStale,
    DEFAULT_EXCHANGE_RATE,
  };
  ```

**Barrel Files:**
- `C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\models\index.js` exports all models
- Views are instantiated and exported individually (not barrel exported)

**Class Pattern - Frontend Views:**
- Extend `View` base class from `C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\View.js`
- Constructor initializes private DOM elements: `this._element = document.querySelector('.selector')`
- Public methods: Event handlers and render methods
- Private methods: Prefixed with `_` for internal utilities
- Export: Either `export default new ClassName()` (instantiated singleton) or `export default ClassName`

---

*Convention analysis: 2026-01-31*
