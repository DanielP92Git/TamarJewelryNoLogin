# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Not installed - No dedicated test framework
- Testing libraries present in dependencies: `@testing-library/jest-dom`, `@testing-library/user-event` (installed but unused)
- No test runner configured in either package.json

**Assertion Library:**
- Not currently used

**Run Commands:**
```bash
# No test commands available - testing is not set up
# Only linting available:
npm run lint              # ESLint check
```

## Current Testing Status

**Test Coverage:**
- None detected - No `.test.js`, `.spec.js` files, or jest/vitest configuration in application code
- Application is deployed without automated tests
- Manual testing only (development/production deployment verified through manual QA)

**Why Testing Is Missing:**
- Small team project (single developer/minimal team)
- Focus on rapid iteration and feature delivery
- Manual testing sufficient for current deployment scale
- DigitalOcean deployment uses manual verification

## Test File Organization

**Location (if added):**
- Co-located: Place tests next to source files
- Pattern: `src/module.js` → `src/module.test.js` or `src/module.spec.js`
- Frontend: `frontend/js/Views/cartView.js` → `frontend/js/Views/cartView.test.js`
- Backend: `backend/services/exchangeRateService.js` → `backend/services/exchangeRateService.test.js`

**Naming:**
- Use `.test.js` for Jest/Vitest compatibility
- Pattern: `{moduleName}.test.js`

## Recommended Test Structure (for future implementation)

If testing were to be added, use this pattern based on current code:

**Frontend View Testing:**
```javascript
// Example: frontend/js/Views/cartView.test.js
import CartView from './cartView';
import * as model from '../model';

describe('CartView', () => {
  let view;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div class="cart-items-container"></div>
      <div class="cart-empty"></div>
      <div class="added-items"></div>
    `;
    view = new CartView();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('_getCurrentCurrency returns default USD', () => {
    localStorage.clear();
    expect(view._getCurrentCurrency()).toBe('usd');
  });

  test('_getItemPrice returns correct USD price', () => {
    const item = { usdPrice: 100, ilsPrice: 370 };
    expect(view._getItemPrice(item)).toBe(100);
  });
});
```

**Backend Service Testing:**
```javascript
// Example: backend/services/exchangeRateService.test.js
const exchangeRateService = require('./exchangeRateService');

describe('exchangeRateService', () => {
  describe('getExchangeRate', () => {
    test('returns stored rate when available', async () => {
      // Mock Settings.getSettings()
      // Assert rate is returned
    });

    test('falls back to default when no rate available', async () => {
      // Mock all sources to fail
      // Assert DEFAULT_EXCHANGE_RATE is returned
    });
  });

  describe('isRateStale', () => {
    test('returns true when rate missing', async () => {
      // Assert missing rate is stale
    });

    test('returns true when rate older than maxAgeHours', async () => {
      // Assert old rate is stale
    });
  });
});
```

**Backend Middleware Testing:**
```javascript
// Example: backend/middleware/auth.test.js
const { fetchUser, authUser } = require('./auth');

describe('auth middleware', () => {
  describe('fetchUser', () => {
    test('returns 401 when no token provided', (done) => {
      const req = { header: () => null };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      fetchUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      done();
    });

    test('calls next() with user when valid token', async () => {
      // Mock JWT verify and Users.findById
      // Assert next() is called with user set on req
    });
  });
});
```

## Mocking

**Framework:**
- Would use Jest or Vitest's built-in mocking
- No current mocking library in use

**Patterns (Recommended):**

**Mock External APIs:**
```javascript
// Mock exchange rate API
jest.mock('node-fetch');
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ rates: { ILS: 3.5 } }),
  })
);
```

**Mock Database:**
```javascript
// Mock Mongoose models
jest.mock('../models', () => ({
  Users: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
  Settings: {
    getSettings: jest.fn(),
  },
}));
```

**Mock File System:**
```javascript
// Mock fs module
jest.mock('fs');
fs.createReadStream = jest.fn();
```

**What to Mock:**
- External APIs (exchange rate API, payment providers)
- Database operations (Mongoose queries)
- File system operations (fs module)
- Network requests (fetch, axios)
- Time-dependent logic (Date, setTimeout)

**What NOT to Mock:**
- Pure utility functions (formatters, calculators)
- Business logic that's being tested
- Error conditions and edge cases (test actual behavior)

## Fixtures and Factories

**Test Data Pattern (Recommended):**
```javascript
// Example: backend/tests/fixtures.js
const mockProduct = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Necklace',
  description: 'A beautiful test necklace',
  usdPrice: 50,
  ilsPrice: 185,
  category: 'necklaces',
  images: ['image1.jpg'],
  quantity: 10,
};

const mockUser = {
  _id: '507f1f77bcf86cd799439012',
  email: 'test@example.com',
  userType: 'user',
};

const mockAdmin = {
  _id: '507f1f77bcf86cd799439013',
  email: 'admin@example.com',
  userType: 'admin',
};
```

**Location:**
- Create `backend/tests/fixtures.js` for backend test data
- Create `frontend/js/tests/fixtures.js` for frontend test data
- Keep fixtures near test files for easy import

## Coverage

**Requirements:** None enforced currently

**View Coverage (if implemented):**
```bash
npm test -- --coverage
```

**Target Coverage (Recommended):**
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

**Areas to Prioritize:**
1. Authentication middleware (`C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\middleware\auth.js`)
2. Exchange rate service (`C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\services\exchangeRateService.js`)
3. Cart operations (`C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\model.js` - cart functions)
4. Payment endpoints (`C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js` - PayPal/Stripe routes)

## Test Types

**Unit Tests (Recommended):**
- Scope: Individual functions and methods
- Approach: Mock all external dependencies
- Focus areas:
  - Utility functions (`normalizeBaseUrl()`, `normalizeCurrency()`)
  - Service methods (`exchangeRateService.getExchangeRate()`)
  - Middleware (`auth.js` functions)
  - Cart operations (`model.js` functions)

**Integration Tests (Recommended):**
- Scope: Multiple modules working together
- Approach: Use real database connection (test DB) or in-memory DB
- Focus areas:
  - API endpoints with authentication
  - Database operations (create/update/delete products)
  - File upload workflow with image processing
  - Cart operations with user persistence

**E2E Tests:**
- Framework: Would use Cypress or Playwright (not currently set up)
- Scope: Complete user flows
- Examples:
  - Login → Add to cart → Checkout
  - Browse categories → Search → Add to cart → Checkout
  - Admin dashboard → Upload product → Verify in frontend

## Common Patterns

**Async Testing:**
```javascript
// Using async/await (preferred)
test('fetches user cart successfully', async () => {
  const result = await model.handleLoadStorage();
  expect(result).toBeDefined();
});

// Using done callback (if needed)
test('handles user authentication', (done) => {
  authUser(req, res, () => {
    expect(req.user).toBeDefined();
    done();
  });
});

// Using promises (older style)
test('fetches products', () => {
  return model.getAPI().then(data => {
    expect(data).toHaveLength(5);
  });
});
```

**Error Testing:**
```javascript
// Testing error throwing
test('throws on invalid rate', async () => {
  await expect(exchangeRateService.updateRate(-1)).rejects.toThrow(
    'Invalid rate value'
  );
});

// Testing error response
test('returns 401 on invalid token', (done) => {
  const req = { header: () => null };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  fetchUser(req, res, () => {
    expect(res.status).toHaveBeenCalledWith(401);
    done();
  });
});

// Testing catch blocks
test('handles API failure gracefully', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
  const result = await exchangeRateService.getExchangeRate();
  expect(result).toBe(DEFAULT_EXCHANGE_RATE);
});
```

## Setup for Future Testing

**Installation (if proceeding):**

```bash
# Backend testing setup
cd backend
npm install --save-dev jest @types/jest

# Add to package.json scripts:
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"

# Create jest.config.js
```

**Frontend testing setup:**

```bash
# Frontend testing setup (already has testing-library)
cd frontend
npm install --save-dev jest @testing-library/jest-dom @testing-library/dom

# Add to package.json scripts:
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"

# Create jest.config.js with DOM environment
```

---

*Testing analysis: 2026-01-31*
