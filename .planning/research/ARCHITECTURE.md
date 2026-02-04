# Architecture Research: Testing Monolithic Express Applications

**Domain:** E-commerce backend testing without refactoring
**Researched:** 2026-02-04
**Confidence:** HIGH

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MVC Pattern: model.js → controller.js → Views/      │   │
│  │  - model.js: localStorage, cart state, API calls     │   │
│  │  - View.js: Base view class, DOM management          │   │
│  │  - controller.js: Router, page navigation            │   │
│  │  - Views/: Page-specific views (home, cart, etc.)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│              Backend (Monolithic Express - 4,233 lines)      │
├─────────────────────────────────────────────────────────────┤
│  index.js: ALL routes, middleware, business logic           │
│  ┌─────────────┬─────────────┬─────────────┬──────────┐    │
│  │   /auth     │  /products  │  /admin     │ /payment │    │
│  │   routes    │  routes     │  routes     │  routes  │    │
│  │             │             │             │          │    │
│  └─────────────┴─────────────┴─────────────┴──────────┘    │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Middleware Layer                                    │    │
│  │  - auth.js: JWT validation, role checks              │    │
│  │  - multer: File upload handling                      │    │
│  │  - cors, helmet, rate limiting                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Services                                            │    │
│  │  - exchangeRateService.js: USD/ILS conversion        │    │
│  │  - jobs/exchangeRateJob.js: Scheduled updates        │    │
│  │  - config/locale.js: GeoIP-based detection           │    │
│  └─────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Models (Mongoose)                                   │    │
│  │  - User.js, Product.js, Settings.js                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  External Services & Storage                                 │
│  ┌──────────────┬──────────────┬──────────────┬─────────┐  │
│  │   MongoDB    │  PayPal API  │  Stripe API  │  DO     │  │
│  │   (Atlas)    │              │              │ Spaces  │  │
│  └──────────────┴──────────────┴──────────────┴─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Recommended Test Architecture

### Test Structure for Monolithic Backend

```
backend/
├── index.js                 # 4,233 lines - NOT refactored
├── tests/                   # NEW - Test suite
│   ├── setup/
│   │   ├── testServer.js    # Express app wrapper (exports app without listening)
│   │   ├── dbSetup.js       # MongoDB test database connection
│   │   └── fixtures.js      # Test data (users, products, tokens)
│   │
│   ├── integration/         # PRIMARY TEST FOCUS
│   │   ├── auth.test.js     # /login, /signup, JWT flows
│   │   ├── products.test.js # /products, /productsByCategory
│   │   ├── cart.test.js     # /addtocart, /getcart, /removefromcart
│   │   ├── admin.test.js    # /addproduct, /removeproduct (admin routes)
│   │   ├── upload.test.js   # /upload (file uploads with multer)
│   │   └── payment.test.js  # /create-order, /capture-order (mocked PayPal/Stripe)
│   │
│   ├── unit/                # SECONDARY - Testable modules only
│   │   ├── middleware/
│   │   │   └── auth.test.js # getTokenFromRequest, fetchUser, requireAdmin
│   │   ├── services/
│   │   │   └── exchangeRateService.test.js
│   │   └── models/
│   │       └── Settings.test.js
│   │
│   └── e2e/                 # DEFER to v1.3+ (requires running server)
│       └── userFlows.test.js
│
├── package.json             # Test scripts added
└── vitest.config.js         # NEW - Test configuration
```

### Frontend Test Structure

```
frontend/
├── js/
│   ├── model.js
│   ├── View.js
│   ├── controller.js
│   └── Views/
│       ├── homePageView.js
│       ├── cartView.js
│       └── categoriesView.js
│
├── tests/                   # NEW
│   ├── setup/
│   │   └── domSetup.js      # happy-dom configuration
│   │
│   ├── unit/
│   │   ├── model.test.js    # Cart operations, localStorage
│   │   ├── View.test.js     # Base view methods
│   │   └── Views/
│   │       ├── cartView.test.js
│   │       └── categoriesView.test.js
│   │
│   └── integration/
│       └── controller.test.js  # Routing, view instantiation
│
├── package.json
└── vitest.config.js         # NEW
```

## Testing Patterns for Monolithic Code

### Pattern 1: Supertest Integration Testing (NO SERVER REFACTOR)

**What:** Test Express routes via HTTP requests without starting a live server

**How it works with monolithic code:**
- Export `app` from index.js WITHOUT calling `app.listen()`
- Supertest starts ephemeral server per test file
- Tests hit actual routes in 4,233-line file
- No refactoring required - test what exists

**Implementation:**

**backend/index.js** (minimal change at end of file):
```javascript
// Existing 4,200+ lines stay unchanged...

// At the very end:
const PORT = process.env.PORT || 3001;

// Only listen if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for testing
module.exports = app;  // <-- ONLY NEW LINE
```

**backend/tests/integration/products.test.js:**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { connectDb } from '../../config/db.js';
import mongoose from 'mongoose';

describe('Product API Integration Tests', () => {
  beforeAll(async () => {
    await connectDb(process.env.MONGO_TEST_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should fetch all products', async () => {
    const response = await request(app)
      .get('/allproducts')
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
  });

  it('should filter products by category', async () => {
    const response = await request(app)
      .post('/productsByCategory')
      .send({ category: 'rings' })
      .expect(200);

    expect(response.body.every(p => p.category === 'rings')).toBe(true);
  });
});
```

**Trade-offs:**
- PRO: No refactoring needed - tests work with existing monolith
- PRO: Tests real routes, middleware, error handling as-is
- PRO: Fast to implement (supertest handles server lifecycle)
- CON: Can't test business logic in isolation (but that's okay for integration tests)
- CON: Slower than unit tests (acceptable - 100-200ms per test)

**When to use:** PRIMARY testing approach for monolithic backends until refactoring occurs

---

### Pattern 2: Database Testing with mongodb-memory-server

**What:** In-memory MongoDB for fast, isolated tests without mocking Mongoose

**Why NOT real MongoDB:**
- Tests run in parallel safely
- No cleanup race conditions
- CI/CD runs without external dependencies
- 10-50x faster than real MongoDB

**Implementation:**

**backend/tests/setup/dbSetup.js:**
```javascript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

export async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
}

export async function teardownTestDB() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

**Usage in tests:**
```javascript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from '../setup/dbSetup.js';

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();  // Fresh state per test
});
```

**Trade-offs:**
- PRO: Same Mongoose models - no mocking
- PRO: Fast (in-memory, no network)
- PRO: Test independence (each test gets clean DB)
- CON: mongodb-memory-server adds ~50MB download (one-time)
- CON: Doesn't test MongoDB Atlas-specific features (rare concern)

**Alternative:** Real test MongoDB database (slower, requires cleanup strategy)

**When to use:** DEFAULT for all backend integration tests

---

### Pattern 3: JWT Authentication in Tests

**What:** Test authenticated routes by generating valid tokens in test setup

**Why NOT mocking auth:**
- Tests actual JWT validation middleware
- Catches token expiry, signature issues
- Tests role-based access control (admin vs user)

**Implementation:**

**backend/tests/setup/fixtures.js:**
```javascript
import jwt from 'jsonwebtoken';
import { Users } from '../../models/index.js';

export async function createTestUser(userType = 'user') {
  const user = await Users.create({
    email: `test-${Date.now()}@example.com`,
    password: 'hashedpassword123',  // Pre-hashed in model
    userType,
  });

  return user;
}

export function generateAuthToken(userId, userType = 'user') {
  return jwt.sign(
    { user: { id: userId, userType } },
    process.env.JWT_KEY,
    { expiresIn: '1h' }
  );
}

export async function createAuthenticatedUser(userType = 'user') {
  const user = await createTestUser(userType);
  const token = generateAuthToken(user._id.toString(), userType);

  return { user, token };
}
```

**Usage:**
```javascript
import { beforeEach } from 'vitest';
import { createAuthenticatedUser } from '../setup/fixtures.js';
import request from 'supertest';
import app from '../../index.js';

describe('Cart API (Authenticated)', () => {
  let userToken;

  beforeEach(async () => {
    const { token } = await createAuthenticatedUser('user');
    userToken = token;
  });

  it('should add item to cart', async () => {
    await request(app)
      .post('/addtocart')
      .set('auth-token', userToken)
      .send({ productId: '123' })
      .expect(200);
  });
});

describe('Admin Routes', () => {
  let adminToken;

  beforeEach(async () => {
    const { token } = await createAuthenticatedUser('admin');
    adminToken = token;
  });

  it('should allow admin to add product', async () => {
    await request(app)
      .post('/addproduct')
      .set('auth-token', adminToken)
      .send({ name: 'Test Product', price: 99 })
      .expect(200);
  });

  it('should reject non-admin user', async () => {
    const { token: userToken } = await createAuthenticatedUser('user');

    await request(app)
      .post('/addproduct')
      .set('auth-token', userToken)
      .send({ name: 'Test Product', price: 99 })
      .expect(403);
  });
});
```

**Trade-offs:**
- PRO: Tests actual middleware logic (fetchUser, requireAdmin)
- PRO: Catches auth bugs (token format, role checks)
- PRO: Simple setup - no mocking JWT library
- CON: Requires JWT_KEY in test env
- CON: Slightly slower than mocking (negligible - 1ms per token)

**When to use:** ALL tests for authenticated routes

---

### Pattern 4: Mocking External Services (PayPal, Stripe, S3)

**What:** Mock HTTP requests to external APIs using MSW (Mock Service Worker)

**Why NOT real API calls:**
- Tests fail when third-party is down
- Can't test error scenarios (card declined, 500 errors)
- Slow (network latency)
- May hit rate limits or cost money

**Implementation with MSW (2026 best practice):**

**backend/tests/setup/mocks.js:**
```javascript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const handlers = [
  // PayPal OAuth token
  http.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', () => {
    return HttpResponse.json({ access_token: 'mock-token', expires_in: 3600 });
  }),

  // PayPal create order
  http.post('https://api-m.sandbox.paypal.com/v2/checkout/orders', () => {
    return HttpResponse.json({
      id: 'mock-order-id',
      status: 'CREATED',
      links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
    });
  }),

  // PayPal capture order
  http.post('https://api-m.sandbox.paypal.com/v2/checkout/orders/:orderId/capture', () => {
    return HttpResponse.json({
      id: 'mock-order-id',
      status: 'COMPLETED',
    });
  }),

  // Stripe create payment intent
  http.post('https://api.stripe.com/v1/payment_intents', () => {
    return HttpResponse.json({
      id: 'pi_mock123',
      client_secret: 'pi_mock123_secret',
      status: 'requires_payment_method',
    });
  }),

  // DigitalOcean Spaces S3 upload
  http.put(/.*digitaloceanspaces\.com.*/, () => {
    return new HttpResponse(null, { status: 200 });
  }),
];

export const mockServer = setupServer(...handlers);

export function setupMocks() {
  mockServer.listen({ onUnhandledRequest: 'warn' });
}

export function teardownMocks() {
  mockServer.close();
}

export function resetMocks() {
  mockServer.resetHandlers();
}
```

**Usage:**
```javascript
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { setupMocks, teardownMocks, resetMocks } from '../setup/mocks.js';
import request from 'supertest';
import app from '../../index.js';

describe('Payment API', () => {
  beforeAll(() => setupMocks());
  afterAll(() => teardownMocks());
  afterEach(() => resetMocks());

  it('should create PayPal order', async () => {
    const response = await request(app)
      .post('/create-order')
      .send({ amount: 99.99 })
      .expect(200);

    expect(response.body.orderId).toBe('mock-order-id');
  });

  it('should handle PayPal API errors', async () => {
    // Override handler for this test
    mockServer.use(
      http.post('https://api-m.sandbox.paypal.com/v2/checkout/orders', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    await request(app)
      .post('/create-order')
      .send({ amount: 99.99 })
      .expect(500);
  });
});
```

**Alternative: Nock (older but simpler):**
```javascript
import nock from 'nock';

beforeEach(() => {
  nock('https://api-m.sandbox.paypal.com')
    .post('/v2/checkout/orders')
    .reply(200, { id: 'mock-order-id', status: 'CREATED' });
});

afterEach(() => {
  nock.cleanAll();
});
```

**Trade-offs:**
- **MSW:**
  - PRO: More modern (2026 standard), better TypeScript support
  - PRO: Works in both Node.js and browser
  - PRO: Can intercept fetch and http.request
  - CON: Slightly more setup
- **Nock:**
  - PRO: Simpler API, less boilerplate
  - PRO: More mature, extensive documentation
  - CON: Node.js only, doesn't intercept fetch in Node 18+

**When to use:** ALL tests that would make external HTTP requests (PayPal, Stripe, exchange rate API, S3 uploads)

---

### Pattern 5: Testing File Uploads (Multer)

**What:** Test multipart form data with supertest's `.attach()` method

**Implementation:**

**backend/tests/integration/upload.test.js:**
```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import path from 'path';
import { createAuthenticatedUser } from '../setup/fixtures.js';
import { setupMocks, teardownMocks } from '../setup/mocks.js';

describe('File Upload', () => {
  let adminToken;

  beforeAll(async () => {
    setupMocks();  // Mock S3 uploads
    const { token } = await createAuthenticatedUser('admin');
    adminToken = token;
  });

  afterAll(() => teardownMocks());

  it('should upload product image', async () => {
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    const response = await request(app)
      .post('/upload')
      .set('auth-token', adminToken)
      .attach('mainImage', testImagePath)  // supertest's .attach() method
      .field('productName', 'Test Ring')
      .expect(200);

    expect(response.body.images).toBeDefined();
    expect(response.body.images.desktop).toMatch(/\.webp$/);
  });

  it('should reject non-image files', async () => {
    const testFilePath = path.join(__dirname, '../fixtures/test.txt');

    await request(app)
      .post('/upload')
      .set('auth-token', adminToken)
      .attach('mainImage', testFilePath)
      .expect(400);
  });

  it('should require authentication', async () => {
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    await request(app)
      .post('/upload')
      .attach('mainImage', testImagePath)
      .expect(401);
  });
});
```

**Fixture setup:**
```
backend/tests/fixtures/
├── test-image.jpg      # 100x100 valid JPEG
├── test-image.png      # 100x100 valid PNG
├── test-image-large.jpg  # >5MB for size validation tests
└── test.txt            # Non-image for rejection tests
```

**Trade-offs:**
- PRO: Tests actual multer middleware (disk storage, file validation)
- PRO: Tests Sharp image processing (WebP conversion)
- PRO: Simple - supertest handles multipart encoding
- CON: Requires fixture files in repo
- CON: Tests create temporary files (cleaned up by multer)

**When to use:** Test all file upload routes (/upload, /addproduct with images)

---

### Pattern 6: Unit Testing Isolated Modules

**What:** Test services and middleware that CAN be tested in isolation

**Which modules to unit test:**
- ✅ `middleware/auth.js` - Pure functions (getTokenFromRequest, requireAdmin)
- ✅ `services/exchangeRateService.js` - API calls (mockable with MSW)
- ✅ `config/locale.js` - Pure logic (header parsing)
- ❌ Routes in index.js - Test via integration tests instead
- ❌ Mongoose models - Test via integration tests with real DB

**Implementation:**

**backend/tests/unit/middleware/auth.test.js:**
```javascript
import { describe, it, expect } from 'vitest';
import { getTokenFromRequest, requireAdmin } from '../../../middleware/auth.js';

describe('Auth Middleware Utils', () => {
  describe('getTokenFromRequest', () => {
    it('should extract token from auth-token header', () => {
      const req = { header: (name) => name === 'auth-token' ? 'token123' : null };
      expect(getTokenFromRequest(req)).toBe('token123');
    });

    it('should extract token from Bearer authorization', () => {
      const req = { header: (name) => name === 'authorization' ? 'Bearer token456' : null };
      expect(getTokenFromRequest(req)).toBe('token456');
    });

    it('should return null if no token', () => {
      const req = { header: () => null };
      expect(getTokenFromRequest(req)).toBeNull();
    });
  });

  describe('requireAdmin', () => {
    it('should call next() for admin user', () => {
      const req = { userDoc: { userType: 'admin' } };
      const res = {};
      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for non-admin user', () => {
      const req = { userDoc: { userType: 'user' } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
```

**backend/tests/unit/services/exchangeRateService.test.js:**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fetchCurrentRate, getExchangeRate } from '../../../services/exchangeRateService.js';
import { setupMocks, teardownMocks } from '../../setup/mocks.js';
import { http, HttpResponse } from 'msw';
import { mockServer } from '../../setup/mocks.js';

describe('Exchange Rate Service', () => {
  beforeAll(() => {
    setupMocks();

    // Mock exchange rate API
    mockServer.use(
      http.get('https://api.exchangerate-api.com/v4/latest/USD', () => {
        return HttpResponse.json({ rates: { ILS: 3.65 } });
      })
    );
  });

  afterAll(() => teardownMocks());

  it('should fetch current rate from API', async () => {
    const { rate, source } = await fetchCurrentRate();
    expect(rate).toBe(3.65);
    expect(source).toBe('exchangerate-api.com');
  });

  it('should fall back to default rate on API failure', async () => {
    mockServer.use(
      http.get('https://api.exchangerate-api.com/v4/latest/USD', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const rate = await getExchangeRate();
    expect(rate).toBe(3.3);  // DEFAULT_EXCHANGE_RATE
  });
});
```

**Trade-offs:**
- PRO: Fast (no DB, no HTTP server)
- PRO: Focused - tests single responsibility
- CON: Limited scope in monolithic code (most logic is in routes)
- CON: Can lead to over-mocking (prefer integration tests)

**When to use:** ONLY for modules that are already separated (middleware, services) - DON'T extract code just to unit test

---

## Frontend Testing Architecture

### Pattern 7: Testing Vanilla JS MVC with Vitest + happy-dom

**What:** Test frontend code in Node.js environment with simulated DOM

**Why happy-dom over jsdom:**
- 10-20x faster than jsdom
- Sufficient DOM API coverage for vanilla JS
- Lighter memory footprint
- 2026 standard for Vitest

**Implementation:**

**frontend/vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup/domSetup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/'],
    },
  },
});
```

**frontend/tests/setup/domSetup.js:**
```javascript
import { beforeEach } from 'vitest';

// Set up localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Set up fetch mock
global.fetch = vi.fn();

// Reset DOM between tests
beforeEach(() => {
  document.body.innerHTML = '';
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  global.fetch.mockClear();
});
```

**frontend/tests/unit/model.test.js:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { cart, handleLoadStorage } from '../../js/model.js';

describe('Model - Cart Operations', () => {
  beforeEach(() => {
    cart.length = 0;  // Clear cart
    localStorage.clear();
  });

  it('should load cart from localStorage when not logged in', async () => {
    const mockCart = [
      { id: 1, title: 'Ring', price: 99, amount: 1 },
    ];
    localStorage.getItem.mockReturnValue(JSON.stringify(mockCart));

    await handleLoadStorage();

    expect(cart).toHaveLength(1);
    expect(cart[0].title).toBe('Ring');
  });

  it('should fetch cart from API when logged in', async () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'auth-token') return 'valid-token';
      return null;
    });

    global.fetch.mockResolvedValue({
      json: async () => [{ id: 2, title: 'Necklace', price: 150, amount: 1 }],
    });

    await handleLoadStorage();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/getcart'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'auth-token': 'valid-token',
        }),
      })
    );
    expect(cart).toHaveLength(1);
  });
});
```

**frontend/tests/unit/Views/cartView.test.js:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import CartView from '../../../js/Views/cartView.js';

describe('CartView', () => {
  let cartView;

  beforeEach(() => {
    document.body.innerHTML = '<div id="cart-container"></div>';
    cartView = new CartView();
  });

  it('should render cart items', () => {
    const mockCart = [
      { id: 1, title: 'Ring', price: 99, amount: 2, image: 'ring.jpg' },
    ];

    cartView.render(mockCart);

    const container = document.querySelector('#cart-container');
    expect(container.innerHTML).toContain('Ring');
    expect(container.innerHTML).toContain('$99');
  });

  it('should update total price', () => {
    const mockCart = [
      { id: 1, price: 99, amount: 2 },
      { id: 2, price: 50, amount: 1 },
    ];

    cartView.render(mockCart);

    const total = document.querySelector('.cart-total').textContent;
    expect(total).toContain('248');  // (99 * 2) + (50 * 1)
  });
});
```

**Trade-offs:**
- PRO: Fast (no real browser)
- PRO: Tests actual DOM manipulation logic
- PRO: Can test View rendering, controller routing
- CON: Not a real browser (may miss CSS/layout bugs)
- CON: Limited for complex interactions (drag-drop, animations)

**When to use:** Unit tests for model, views, controller routing logic

---

## Data Flow in Testing

### Request Flow (Backend Integration Tests)

```
Test → Supertest → Express App → Middleware → Route Handler → MongoDB (in-memory) → Response
                                                      ↓
                                            External Service (MSW mock)
```

### Test Data Flow

```
beforeAll: Setup test DB, mock server
    ↓
beforeEach: Clear DB, create fixtures (users, products), generate tokens
    ↓
Test: Make HTTP request with supertest
    ↓
Assert: Response status, body, DB state
    ↓
afterEach: (optional) Clean up test-specific data
    ↓
afterAll: Teardown test DB, close mock server
```

## Build Order for Test Implementation

### Phase 1: Test Infrastructure (1-2 days)
1. Install dependencies (vitest, supertest, mongodb-memory-server, msw)
2. Create test directory structure
3. Configure vitest.config.js (backend and frontend)
4. Create setup files (dbSetup.js, mocks.js, fixtures.js, domSetup.js)
5. Update package.json scripts
6. Verify CI/CD compatibility

### Phase 2: Backend Integration Tests (3-5 days)
1. **Auth routes** (highest priority - security critical)
   - /login, /signup
   - JWT validation flows
2. **Product routes** (core functionality)
   - /allproducts, /productsByCategory
   - Public routes (no auth)
3. **Cart routes** (authenticated)
   - /addtocart, /removefromcart, /getcart
   - User-specific tests
4. **Admin routes** (role-based access)
   - /addproduct, /removeproduct
   - Admin vs user permission tests
5. **Upload routes** (file handling)
   - /upload with multer
   - Image validation, Sharp processing
6. **Payment routes** (external service mocking)
   - /create-order, /capture-order
   - PayPal/Stripe mocked flows

### Phase 3: Backend Unit Tests (1-2 days)
1. Middleware (auth.js functions)
2. Services (exchangeRateService.js)
3. Config utilities (locale.js)

### Phase 4: Frontend Tests (2-3 days)
1. **Model tests** (localStorage, cart state)
2. **View tests** (DOM rendering)
3. **Controller tests** (routing logic)

### Phase 5: CI/CD Integration (1 day)
1. Update GitHub Actions / CI pipeline
2. Add test coverage reporting
3. Configure test database for CI

## Anti-Patterns to Avoid

### Anti-Pattern 1: Extracting Code Just to Test It

**What people do:** Refactor monolithic code into smaller modules solely to enable unit testing

**Why it's wrong:**
- Violates "refactor later" constraint
- Risk of breaking working code
- Tests should inform refactoring, not vice versa

**Do this instead:**
- Test monolithic code via integration tests with supertest
- Accept that integration tests are slower (100-200ms vs 5ms)
- Wait until v1.3+ to refactor with tests as safety net

---

### Anti-Pattern 2: Mocking Everything

**What people do:** Mock MongoDB, JWT, middleware, business logic to create "pure" unit tests

**Why it's wrong:**
- Tests become coupled to implementation, not behavior
- Mocking mongoose queries is brittle and complex
- False confidence - tests pass but real DB integration fails

**Do this instead:**
- Use mongodb-memory-server for REAL Mongoose interactions
- Generate REAL JWT tokens in tests
- Mock ONLY external HTTP services (PayPal, Stripe, S3)

---

### Anti-Pattern 3: Testing Implementation Details

**What people do:** Test that specific internal functions are called or specific data structures exist

**Example:**
```javascript
// BAD
it('should call validateProduct helper', () => {
  const spy = vi.spyOn(helpers, 'validateProduct');
  addProduct({ name: 'Ring' });
  expect(spy).toHaveBeenCalled();
});

// GOOD
it('should reject product without name', async () => {
  await request(app)
    .post('/addproduct')
    .send({ price: 99 })  // Missing name
    .expect(400);
});
```

**Why it's wrong:**
- Refactoring breaks tests even if behavior unchanged
- Tests become maintenance burden
- Doesn't test user-facing behavior

**Do this instead:**
- Test HTTP API contract (request → response)
- Test database state changes
- Test user-observable behavior

---

### Anti-Pattern 4: One Giant Test File

**What people do:** Put all 100+ tests in `backend/tests/api.test.js`

**Why it's wrong:**
- Slow to run (can't parallelize)
- Hard to find failing tests
- Shared state leaks between tests

**Do this instead:**
- One test file per route group (auth.test.js, products.test.js, cart.test.js)
- Vitest runs files in parallel by default
- Easier to run subset: `vitest auth.test.js`

---

### Anti-Pattern 5: Not Testing Error Cases

**What people do:** Only test happy path (valid inputs, 200 responses)

**Why it's wrong:**
- Bugs happen in error handling
- Edge cases cause production issues
- Missing validation errors

**Do this instead:**
- Test BOTH success and failure for each route
- Test validation errors (400 responses)
- Test authentication failures (401, 403)
- Test external service failures (PayPal 500 error)

**Example:**
```javascript
describe('POST /addproduct', () => {
  it('should create product with valid data', async () => { /* ... */ });
  it('should reject product without name', async () => { /* ... */ });
  it('should reject non-admin user', async () => { /* ... */ });
  it('should reject invalid price', async () => { /* ... */ });
  it('should handle database errors', async () => { /* ... */ });
});
```

---

## Scaling Considerations

### Test Suite Size: 0-50 tests (MVP)
- Run all tests on every commit
- Total runtime: 10-30 seconds
- mongodb-memory-server sufficient
- No test parallelization needed

### Test Suite Size: 50-200 tests (Growing)
- Vitest parallel execution by default
- Total runtime: 30-60 seconds
- Consider test.only for focused development
- CI/CD caching for node_modules, mongodb-memory-server

### Test Suite Size: 200+ tests (Mature)
- Split into unit/integration/e2e suites
- Run unit tests in watch mode during development
- Run integration tests pre-commit
- Run e2e tests pre-deploy only
- Total runtime: 1-3 minutes (acceptable for CI)

### Performance Optimization Priorities

1. **First bottleneck:** Test database setup/teardown
   - **Fix:** Reuse mongodb-memory-server instance across test files
   - **Setup:** globalSetup in vitest.config.js

2. **Second bottleneck:** External service mocks not cleaning up
   - **Fix:** Ensure mockServer.resetHandlers() in afterEach

3. **Third bottleneck:** Too many integration tests
   - **Fix:** Defer to unit tests where possible (but DON'T refactor code just to test)

## Integration Points

### External Services

| Service | Integration Pattern | Test Strategy |
|---------|---------------------|---------------|
| PayPal API | HTTP (oauth + orders) | Mock with MSW (http handlers) |
| Stripe API | HTTP (payment intents) | Mock with MSW or use stripe-mock server |
| DigitalOcean Spaces | S3-compatible SDK | Mock with MSW (http.put for uploads) |
| Exchange Rate API | HTTP (free API) | Mock with MSW (return fixed rate) |
| EmailJS | HTTP (contact forms) | Mock with MSW or skip in tests |
| MongoDB | Mongoose ODM | Use mongodb-memory-server (real DB) |

### Internal Boundaries

| Boundary | Communication | Test Strategy |
|----------|---------------|---------------|
| index.js → middleware/auth.js | Function calls | Integration tests (via supertest) + unit tests for pure functions |
| index.js → models/*.js | Mongoose methods | Integration tests with mongodb-memory-server |
| index.js → services/*.js | Function calls | Integration tests + unit tests for services |
| Frontend → Backend API | HTTP/REST | Integration tests (backend) + mocked fetch (frontend) |

## What NOT to Test Yet (Defer to v1.3+)

### Skip These Until After Refactoring:

1. **E2E tests with real browser**
   - Playwright/Cypress tests
   - Full user workflows (login → browse → checkout)
   - Reason: Slow, brittle, high maintenance

2. **Performance tests**
   - Load testing (100s of concurrent requests)
   - Response time benchmarks
   - Reason: Premature optimization, requirements unclear

3. **Visual regression tests**
   - Screenshot comparison
   - CSS/layout validation
   - Reason: Frontend structure may change during refactoring

4. **Tests for code you plan to delete**
   - Legacy routes marked for removal
   - Deprecated features
   - Reason: Wasted effort, will be deleted anyway

5. **100% code coverage**
   - Chasing coverage metrics
   - Testing trivial getters/setters
   - Reason: Diminishing returns, integration tests cover most paths

### Pragmatic Coverage Goals:

- **Critical paths:** 90%+ coverage (auth, payments, cart)
- **Public routes:** 80%+ coverage (products, categories)
- **Admin routes:** 70%+ coverage (less used, lower risk)
- **Edge cases:** Test known bugs, common errors
- **Overall:** 70-80% coverage is excellent for monolithic code

---

## Sources

### Testing Monolithic Express Applications
- [How to Test Your Express.js and Mongoose Apps with Jest and SuperTest](https://www.freecodecamp.org/news/how-to-test-in-express-and-mongoose-apps/)
- [How to Test Your Express API with SuperTest](https://rahmanfadhil.com/test-express-with-supertest/)
- [Guide to writing integration tests in express js with Jest and Supertest](https://dev.to/ali_adeku/guide-to-writing-integration-tests-in-express-js-with-jest-and-supertest-1059)
- [How to correctly unit test Express server](https://glebbahmutov.com/blog/how-to-correctly-unit-test-express-server/)

### MongoDB Testing Strategies
- [Integration and End-to-end Tests Made Easy with Node.js and MongoDB](https://www.toptal.com/nodejs/integration-and-e2e-tests-nodejs-mongodb)
- [Reliable Integration Testing for MongoDB Atlas Search with Testcontainers and Jest](https://medium.com/adeo-tech/reliable-integration-testing-for-mongodb-atlas-search-with-testcontainers-and-jest-ef318abe7f7c)
- [Integration Tests with In-Memory MongoDB](https://medium.com/tech-thesignalgroup/integration-tests-with-in-memory-mongodb-b1482ce5d179)

### Mocking External Services
- [How to Mock External APIs in Node.js Tests Without Flaky Network Calls](https://oneuptime.com/blog/post/2026-01-06-nodejs-mock-external-apis-tests/view)
- [Automated testing | Stripe Documentation](https://docs.stripe.com/automated-testing)
- [stripe-mock: HTTP server that responds like the real Stripe API](https://github.com/stripe/stripe-mock)

### JWT Authentication Testing
- [Test JWT-Authenticated Express Routes with Jest And SuperTest](https://blog.stvmlbrn.com/2018/06/18/test-jwt-authenticated-express-routes-with-jest-and-supertest.html)
- [Testing with authenticated routes in Express](https://medium.com/@bill_broughton/testing-with-authenticated-routes-in-express-6fa9c4c335ca)

### File Upload Testing
- [Multer File Upload in Express.js: Complete Guide for 2026](https://dev.to/marufrahmanlive/multer-file-upload-in-expressjs-complete-guide-for-2026-1i9p)
- [How to Test Your Express APIs with Supertest](https://dev.to/rahmanfadhil/how-to-test-your-express-apis-with-supertest-4j1a)

### Vitest vs Jest
- [Vitest vs Jest 30: Why 2026 is the Year of Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb)
- [Jest vs Vitest: Which Test Runner Should You Use in 2025?](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [Why I Chose Vitest Over Jest: 10x Faster Tests & Native ESM Support](https://dev.to/saswatapal/why-i-chose-vitest-over-jest-10x-faster-tests-native-esm-support-13g6)

### Frontend Testing with Vanilla JavaScript
- [The MVC Design Pattern in Vanilla JavaScript](https://www.sitepoint.com/mvc-design-pattern-javascript/)
- [Vitest: Blazing fast unit test framework](https://uploadcare.com/blog/vitest-unit-test-framework/)
- [Component Testing | Guide | Vitest](https://vitest.dev/guide/browser/component-testing)

### happy-dom vs jsdom
- [jsdom vs happy-dom: Navigating the Nuances of JavaScript Testing](https://blog.seancoughlin.me/jsdom-vs-happy-dom-navigating-the-nuances-of-javascript-testing)
- [DOM Testing with Happy DOM and Testing Library](https://www.jetbrains.com/guide/javascript/tutorials/eleventy-tsx/happy-dom/)

### Testing Strategies for Monolithic Applications
- [Monolithic vs Microservices Testing: Strategies That Scale](https://www.virtuosoqa.com/post/microservices-vs-monolithic-architecture-testing-strategies)
- [Testing Strategies in Monolithic vs Microservices Architecture](https://www.browserstack.com/guide/testing-strategies-in-microservices-vs-monolithic-applications)

---

*Architecture research for: Testing Monolithic Express E-commerce Backend*
*Researched: 2026-02-04*
