# Stack Research - Test Infrastructure

**Domain:** Test Infrastructure for E-commerce Application
**Researched:** 2026-02-04
**Confidence:** HIGH

## Recommended Stack

### Core Testing Frameworks

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 4.0.18+ | Test framework for both backend and frontend | Modern, fast (10-20x faster than Jest in watch mode), native ESM support, works seamlessly with Node.js 22. Compatible with most Jest APIs allowing easy migration patterns. 30.8M weekly downloads as of January 2026. |
| Supertest | ^7.0.0 | HTTP integration testing for Express APIs | Industry standard for testing Express routes. Works in-memory without spinning up actual server. Perfect for testing payment endpoints, auth flows, and file uploads without external calls. |
| mongodb-memory-server | 11.0.1+ | In-memory MongoDB for isolated testing | Spins up isolated MongoDB instances per test suite. No shared state, no test pollution. Lightweight (~7MB per instance). Essential for testing Mongoose models and DB operations. |
| Happy-DOM | ^15.0.0 | DOM simulation for frontend tests | Faster and lighter than JSDOM. Sufficient for testing vanilla JS DOM manipulation in your MVC views. Integrates perfectly with Vitest. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| aws-sdk-mock | ^6.1.0 | Mock S3-compatible DigitalOcean Spaces | For testing Sharp image processing and file upload flows without hitting actual Spaces. Works with AWS SDK v2 (your current aws-sdk@2.1693.0). |
| nock | ^14.0.0 | HTTP request mocking | Mock external API calls (PayPal, Stripe, exchange rate API) at the HTTP layer. More comprehensive than simple stubs. Updated January 21, 2026. |
| sinon | 21.0.1+ | Spies, stubs, and mocks | For mocking module dependencies, timers (node-cron tests), and complex async flows. Pairs well with Vitest. |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage reports | Native V8 coverage using c8 under the hood. Built into Vitest. Faster than Istanbul/nyc. Generates HTML, JSON, and lcov reports. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest UI | Visual test runner | Built into Vitest. Run `vitest --ui` for browser-based test dashboard. Excellent for debugging monolithic backend tests. |
| c8 | Code coverage engine | Built into Vitest via @vitest/coverage-v8. Uses Node.js native V8 coverage. No additional config needed. |
| Vitest VS Code Extension | IDE integration | Optional but recommended. Inline test results, debugging, and coverage in VS Code. |

## Installation

```bash
# Backend testing dependencies (from /backend)
npm install -D vitest @vitest/coverage-v8 supertest mongodb-memory-server aws-sdk-mock nock sinon happy-dom

# Frontend testing dependencies (from /frontend)
npm install -D vitest @vitest/coverage-v8 happy-dom

# Optional: Vitest UI for both
npm install -D @vitest/ui
```

## Configuration Strategy

### Backend Vitest Config (`backend/vitest.config.js`)

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment for backend tests
    environment: 'node',

    // Test file patterns
    include: ['**/*.test.js', '**/*.spec.js'],
    exclude: ['node_modules', 'dist', 'uploads'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['**/*.js'],
      exclude: [
        'node_modules/**',
        'uploads/**',
        'jobs/exchangeRateJob.js', // Cron job tested via integration
        '**/*.test.js',
        '**/*.spec.js'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70
      }
    },

    // Timeout for payment/upload tests
    testTimeout: 10000,

    // Sequential for DB tests to avoid race conditions
    sequence: {
      concurrent: false // Critical for mongodb-memory-server tests
    },

    // Setup files
    setupFiles: ['./tests/setup.js']
  }
});
```

### Frontend Vitest Config (`frontend/vitest.config.js`)

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Happy-DOM for lightweight DOM simulation
    environment: 'happy-dom',

    // Test file patterns
    include: ['js/**/*.test.js', 'js/**/*.spec.js'],
    exclude: ['node_modules', 'dist', '.parcel-cache'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['js/**/*.js'],
      exclude: [
        'js/**/*.test.js',
        'js/**/*.spec.js',
        'js/config.js' // Environment vars, not testable
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60
      }
    },

    // Faster tests for frontend
    testTimeout: 5000,

    // Setup files for DOM globals
    setupFiles: ['./tests/setup.js']
  }
});
```

### Test Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

## Testing Patterns for Monolithic Backend

### Pattern 1: Express Route Testing with Supertest

```javascript
// backend/tests/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../index.js'; // Export app separately from server

let mongoServer;

beforeAll(async () => {
  // Spin up isolated MongoDB
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('POST /api/auth/login', () => {
  it('should return JWT token for valid credentials', async () => {
    // Create test user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'securepass123'
      });

    // Test login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'securepass123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });
});
```

### Pattern 2: Mocking External Payment APIs

```javascript
// backend/tests/payments/stripe.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import nock from 'nock';
import request from 'supertest';
import app from '../../index.js';

describe('POST /api/payments/stripe', () => {
  beforeEach(() => {
    // Mock Stripe API calls
    nock('https://api.stripe.com')
      .post('/v1/payment_intents')
      .reply(200, {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 5000,
        currency: 'usd'
      });
  });

  it('should create payment intent and return client secret', async () => {
    const response = await request(app)
      .post('/api/payments/stripe')
      .send({
        amount: 50.00,
        currency: 'USD',
        items: [{ id: 'prod_123', quantity: 1 }]
      })
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.clientSecret).toBe('pi_test123_secret');
  });

  it('should handle Stripe API errors gracefully', async () => {
    nock.cleanAll();
    nock('https://api.stripe.com')
      .post('/v1/payment_intents')
      .reply(402, {
        error: {
          type: 'card_error',
          message: 'Your card was declined'
        }
      });

    const response = await request(app)
      .post('/api/payments/stripe')
      .send({ amount: 50.00, currency: 'USD' })
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(402);
    expect(response.body.error).toBeDefined();
  });
});
```

### Pattern 3: Mocking S3-Compatible DigitalOcean Spaces

```javascript
// backend/tests/uploads/images.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AWS from 'aws-sdk-mock';
import request from 'supertest';
import app from '../../index.js';
import path from 'path';

describe('POST /api/products/upload-image', () => {
  beforeEach(() => {
    // Mock S3 upload to DigitalOcean Spaces
    AWS.mock('S3', 'upload', (params, callback) => {
      callback(null, {
        Location: `https://spaces.example.com/${params.Key}`,
        Key: params.Key,
        Bucket: params.Bucket
      });
    });
  });

  afterEach(() => {
    AWS.restore('S3');
  });

  it('should process and upload image to Spaces', async () => {
    const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

    const response = await request(app)
      .post('/api/products/upload-image')
      .set('Authorization', 'Bearer admin_token')
      .attach('image', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.desktopUrl).toContain('spaces.example.com');
    expect(response.body.mobileUrl).toContain('spaces.example.com');
  });

  it('should validate image dimensions with Sharp', async () => {
    // Test Sharp processing without actual S3 upload
    const response = await request(app)
      .post('/api/products/upload-image')
      .set('Authorization', 'Bearer admin_token')
      .attach('image', Buffer.from('not-an-image'));

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid image format');
  });
});
```

### Pattern 4: Testing Mongoose Models

```javascript
// backend/tests/models/product.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database between tests
  await Product.deleteMany({});
});

describe('Product Model', () => {
  it('should create product with valid data', async () => {
    const productData = {
      name: { eng: 'Test Bracelet', heb: 'צמיד בדיקה' },
      price: { USD: 50, ILS: 180 },
      category: 'bracelets',
      mainImage: {
        desktop: 'image-desktop.webp',
        mobile: 'image-mobile.webp'
      }
    };

    const product = await Product.create(productData);

    expect(product._id).toBeDefined();
    expect(product.name.eng).toBe('Test Bracelet');
    expect(product.price.USD).toBe(50);
  });

  it('should validate required fields', async () => {
    const invalidProduct = new Product({});

    await expect(invalidProduct.save()).rejects.toThrow();
  });

  it('should update displayOrder for drag-and-drop', async () => {
    const product1 = await Product.create({
      name: { eng: 'Product 1', heb: 'מוצר 1' },
      price: { USD: 30, ILS: 100 },
      category: 'rings',
      displayOrder: 0
    });

    const product2 = await Product.create({
      name: { eng: 'Product 2', heb: 'מוצר 2' },
      price: { USD: 40, ILS: 140 },
      category: 'rings',
      displayOrder: 1
    });

    // Swap display order
    product1.displayOrder = 1;
    product2.displayOrder = 0;
    await product1.save();
    await product2.save();

    const products = await Product.find({ category: 'rings' })
      .sort({ displayOrder: 1 });

    expect(products[0]._id.toString()).toBe(product2._id.toString());
    expect(products[1]._id.toString()).toBe(product1._id.toString());
  });
});
```

### Pattern 5: Testing Currency Conversion Service

```javascript
// backend/tests/services/exchangeRate.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { getExchangeRate, updateExchangeRate } from '../../services/exchangeRateService.js';

describe('Exchange Rate Service', () => {
  beforeEach(() => {
    // Mock external exchange rate API
    nock('https://api.exchangerate-api.com')
      .get(/v6\/.*\/latest\/USD/)
      .reply(200, {
        result: 'success',
        conversion_rates: {
          ILS: 3.62
        }
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch and return current exchange rate', async () => {
    const rate = await getExchangeRate();

    expect(rate).toBe(3.62);
  });

  it('should handle API errors with fallback rate', async () => {
    nock.cleanAll();
    nock('https://api.exchangerate-api.com')
      .get(/v6\/.*\/latest\/USD/)
      .reply(500);

    const rate = await getExchangeRate();

    // Should return cached or default rate
    expect(rate).toBeGreaterThan(0);
  });

  it('should update Settings with new exchange rate', async () => {
    await updateExchangeRate();

    const settings = await Settings.findOne({});
    expect(settings.exchangeRate.USDILS).toBe(3.62);
    expect(settings.exchangeRate.lastUpdated).toBeInstanceOf(Date);
  });
});
```

### Pattern 6: Testing node-cron Jobs

```javascript
// backend/tests/jobs/exchangeRateJob.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';
import cron from 'node-cron';

describe('Exchange Rate Cron Job', () => {
  let clock;

  beforeEach(() => {
    // Use Sinon's fake timers to control time
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should execute exchange rate update on schedule', async () => {
    const updateSpy = vi.fn();

    // Mock the scheduled task
    const task = cron.schedule('0 0 * * *', updateSpy, {
      scheduled: false
    });

    task.start();

    // Fast-forward 24 hours
    await clock.tickAsync(24 * 60 * 60 * 1000);

    expect(updateSpy).toHaveBeenCalledTimes(1);

    task.stop();
  });
});
```

## Frontend Testing Patterns

### Pattern 7: Testing Vanilla JS MVC Views

```javascript
// frontend/js/Views/cartView.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import CartView from './cartView.js';

describe('CartView', () => {
  beforeEach(() => {
    // Setup DOM structure
    document.body.innerHTML = `
      <div id="app">
        <div class="cart-container"></div>
        <div class="cart-total"></div>
      </div>
    `;
  });

  it('should render cart items', () => {
    const cartView = new CartView();
    const mockItems = [
      {
        id: '123',
        name: { eng: 'Test Ring', heb: 'טבעת בדיקה' },
        price: { USD: 50, ILS: 180 },
        quantity: 2
      }
    ];

    cartView.render(mockItems, 'eng', 'USD');

    const container = document.querySelector('.cart-container');
    expect(container.innerHTML).toContain('Test Ring');
    expect(container.innerHTML).toContain('$50');
  });

  it('should calculate correct total', () => {
    const cartView = new CartView();
    const mockItems = [
      { price: { USD: 50, ILS: 180 }, quantity: 2 },
      { price: { USD: 30, ILS: 100 }, quantity: 1 }
    ];

    cartView.render(mockItems, 'eng', 'USD');

    const totalElement = document.querySelector('.cart-total');
    expect(totalElement.textContent).toContain('$130');
  });

  it('should handle RTL rendering for Hebrew', () => {
    const cartView = new CartView();
    const mockItems = [
      {
        name: { eng: 'Ring', heb: 'טבעת' },
        price: { USD: 50, ILS: 180 }
      }
    ];

    cartView.render(mockItems, 'heb', 'ILS');

    const container = document.querySelector('.cart-container');
    expect(container.getAttribute('dir')).toBe('rtl');
    expect(container.innerHTML).toContain('טבעת');
    expect(container.innerHTML).toContain('₪180');
  });
});
```

### Pattern 8: Testing Model State Management

```javascript
// frontend/js/model.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as model from './model.js';

describe('Model - Cart State', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    model.state.cart = [];
  });

  it('should add item to cart', () => {
    const product = {
      id: '123',
      name: { eng: 'Test Ring' },
      price: { USD: 50 }
    };

    model.addToCart(product);

    expect(model.state.cart).toHaveLength(1);
    expect(model.state.cart[0].id).toBe('123');
  });

  it('should persist cart to localStorage', () => {
    const product = {
      id: '123',
      name: { eng: 'Test Ring' },
      price: { USD: 50 }
    };

    model.addToCart(product);

    const stored = JSON.parse(localStorage.getItem('cart'));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('123');
  });

  it('should restore cart from localStorage on load', () => {
    localStorage.setItem('cart', JSON.stringify([
      { id: '456', name: { eng: 'Saved Item' }, price: { USD: 30 } }
    ]));

    model.loadCart();

    expect(model.state.cart).toHaveLength(1);
    expect(model.state.cart[0].id).toBe('456');
  });
});
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vitest | Jest | Only if already heavily invested in Jest ecosystem with custom matchers/reporters. Vitest is faster and more modern for new test suites. |
| Vitest | Mocha + Chai | If team strongly prefers BDD style (describe/it with Chai assertions). However, Vitest supports both styles and is faster. |
| Happy-DOM | JSDOM | If you need comprehensive browser API emulation (complex CSS, layout calculations). For vanilla JS DOM testing, Happy-DOM is sufficient and 2-3x faster. |
| mongodb-memory-server | Shared test database | Never for unit tests. Shared DB causes flaky tests and race conditions. Only use for manual integration testing. |
| Supertest | Manual server spinning | Never. Supertest's in-memory testing is faster and doesn't require port management. |
| nock | Manual HTTP mocking | If nock's declarative API feels cumbersome, use Sinon stubs. But nock is more comprehensive for HTTP-specific scenarios. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Jest | Slower than Vitest (10-20x in watch mode), experimental ESM support, larger footprint. Vitest is Jest-compatible but modern. | Vitest |
| Mocha + Chai + Istanbul | Requires assembling multiple packages. More configuration overhead. No built-in watch mode or parallelization like Vitest. | Vitest (includes everything) |
| JSDOM for all tests | Heavier and slower than Happy-DOM. JSDOM is 3-5x slower for simple DOM operations. Your vanilla JS doesn't need full browser emulation. | Happy-DOM for most tests, JSDOM only if edge cases arise |
| nyc (Istanbul) for coverage | Slower than c8/V8 native coverage. Instrumentation adds overhead. c8 uses Node.js built-in coverage without code transformation. | @vitest/coverage-v8 (built into Vitest) |
| Separate test databases | Shared MongoDB causes test pollution, race conditions, and flaky tests. Wastes time debugging non-deterministic failures. | mongodb-memory-server (isolated per suite) |
| Mocking Stripe/PayPal SDKs directly | SDK mocks are brittle and break with version updates. Testing payment logic without HTTP layer misses integration issues. | nock to mock HTTP calls instead |
| Manual spy/mock implementations | Reinventing spies/stubs leads to bugs and maintenance burden. Use battle-tested libraries. | Sinon for complex mocking scenarios |
| Testing node-cron with real timers | Tests take forever (waiting for actual intervals) and are fragile. Can't test 24-hour schedules in CI. | Sinon fake timers (control time) |

## Integration with Existing Stack

### Parcel Bundler Compatibility

**No additional configuration needed:**
- Vitest doesn't run through Parcel for tests
- Frontend tests import source files directly (not bundled)
- Parcel is only used for production builds, not test runs

**If you need Parcel transformations in tests:**
```javascript
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // If you have Parcel-specific transformations
    alias: {
      '@': '/js' // Map imports if needed
    }
  }
});
```

### Express Monolithic Architecture

**Challenges:**
- 3,662-line `index.js` makes unit testing difficult
- Routes, middleware, and business logic are intertwined
- Hard to test individual functions in isolation

**Testing Strategy:**
1. **Integration tests first** (via Supertest): Test complete request flows through monolith
2. **Extract testable modules**: Gradually refactor utils/services out of index.js
3. **Test extracted modules**: Unit test pure functions (currency conversion, validation, etc.)
4. **Mock external dependencies**: Use nock for all HTTP calls, aws-sdk-mock for S3

**Export Pattern for Testing:**
```javascript
// backend/index.js (bottom of file)
// Separate server from app for testing
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export app for Supertest (don't start server in tests)
export default app;
export { server };
```

### Multi-Language Testing Considerations

**RTL and Bilingual Support:**
Your app supports English/Hebrew with RTL. Test both:

```javascript
describe('Product display', () => {
  it('should render in English (LTR)', () => {
    view.render(product, 'eng', 'USD');
    expect(container.getAttribute('dir')).toBeNull(); // Default LTR
  });

  it('should render in Hebrew (RTL)', () => {
    view.render(product, 'heb', 'ILS');
    expect(container.getAttribute('dir')).toBe('rtl');
  });
});
```

### Payment Integration Testing

**Critical: Never hit live payment APIs in tests**

**Stripe Testing:**
- Use nock to mock `https://api.stripe.com` endpoints
- Test with Stripe's test card numbers (4242 4242 4242 4242)
- Verify webhook signature validation logic with mock signatures

**PayPal Testing:**
- Mock PayPal SDK methods with Sinon
- Test sandbox credentials configuration
- Verify order creation and capture flows without live API calls

**Example:**
```javascript
describe('PayPal Integration', () => {
  it('should create order with correct amount', async () => {
    nock('https://api-m.sandbox.paypal.com')
      .post('/v2/checkout/orders')
      .reply(200, {
        id: 'ORDER_123',
        status: 'CREATED'
      });

    const response = await request(app)
      .post('/api/payments/paypal/create-order')
      .send({ amount: 50.00, currency: 'USD' });

    expect(response.status).toBe(200);
    expect(response.body.orderId).toBe('ORDER_123');
  });
});
```

## Coverage Thresholds Strategy

**Prioritize high-risk areas:**

| Area | Target Coverage | Rationale |
|------|-----------------|-----------|
| Auth (JWT, bcrypt) | 85%+ | Security critical. Vulnerabilities expose user data. |
| Payments (Stripe, PayPal) | 80%+ | Financial risk. Failed payments lose revenue. |
| File uploads (Sharp, S3) | 75%+ | Broken uploads break product management. |
| Currency conversion | 75%+ | Wrong rates cost money or confuse customers. |
| Mongoose models | 70%+ | Data integrity. Bugs corrupt database. |
| Express routes | 70%+ | Integration tests catch middleware/auth issues. |
| Frontend MVC | 60%+ | Lower risk. UI bugs are visible immediately. |
| Utilities | 80%+ | Pure functions easy to test, no excuse for low coverage. |

**Implementation:**
```javascript
// vitest.config.js
coverage: {
  thresholds: {
    // Global baseline
    lines: 70,

    // Per-file overrides
    'middleware/auth.js': { lines: 85 },
    'services/exchangeRateService.js': { lines: 75 },
    'models/*.js': { lines: 70 }
  }
}
```

## Test Organization

```
backend/
├── tests/
│   ├── setup.js                    # MongoDB memory server setup
│   ├── fixtures/                   # Test data (images, JSON)
│   ├── auth/
│   │   ├── login.test.js
│   │   └── register.test.js
│   ├── payments/
│   │   ├── stripe.test.js
│   │   └── paypal.test.js
│   ├── uploads/
│   │   ├── images.test.js
│   │   └── sharp.test.js
│   ├── models/
│   │   ├── product.test.js
│   │   ├── user.test.js
│   │   └── settings.test.js
│   ├── services/
│   │   └── exchangeRate.test.js
│   └── jobs/
│       └── exchangeRateJob.test.js
├── vitest.config.js
└── package.json

frontend/
├── js/
│   ├── Views/
│   │   ├── cartView.js
│   │   └── cartView.test.js        # Co-located with implementation
│   ├── model.js
│   ├── model.test.js
│   └── controller.test.js
├── tests/
│   ├── setup.js                    # Happy-DOM globals
│   └── fixtures/
│       └── mockProducts.json
├── vitest.config.js
└── package.json
```

## CI/CD Integration

**GitHub Actions example:**

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install backend dependencies
        run: cd backend && npm ci

      - name: Run backend tests
        run: cd backend && npm run test:coverage

      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Run frontend tests
        run: cd frontend && npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info
```

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| vitest | 4.0.18+ | Node.js 18-22 | Minimum Node.js 18 required. Works perfectly with Node.js 22.15.0 (your version). |
| supertest | 7.0.0+ | Express 4.x, 5.x | Works with your Express 4.20.0. Compatible with Node.js 18+. |
| mongodb-memory-server | 11.0.1+ | Mongoose 6.x, 7.x, 8.x | Works with your Mongoose 8.6.1. Downloads MongoDB 8.2.1 binaries by default. |
| happy-dom | 15.0.0+ | Node.js 18+ | Lighter alternative to JSDOM. Perfect for vanilla JS testing. |
| aws-sdk-mock | 6.1.0+ | aws-sdk v2.x | Works with your aws-sdk@2.1693.0 for DigitalOcean Spaces mocking. |
| nock | 14.0.0+ | Node.js 18+ | Updated January 21, 2026. Compatible with all HTTP client libraries. |
| sinon | 21.0.1+ | All Node.js versions | Published 2 months ago (Dec 2025). Works with Vitest out of box. |
| @vitest/coverage-v8 | 4.0.18+ | Vitest 4.x | Must match Vitest version exactly. Built-in c8 coverage. |

## Performance Benchmarks

**Estimated test run times (for comprehensive suite):**

| Test Suite | Tests | Time (Vitest) | Time (Jest equivalent) |
|------------|-------|---------------|------------------------|
| Backend integration | 50 tests | ~15s | ~45s |
| Backend unit | 100 tests | ~5s | ~20s |
| Frontend unit | 80 tests | ~3s | ~12s |
| **Total** | **230 tests** | **~23s** | **~77s** |

**Watch mode performance:**
- Vitest watch: Re-run affected tests in <1s
- Jest watch: Re-run affected tests in 3-5s

**Coverage generation overhead:**
- Vitest with c8: +2s
- Jest with Istanbul: +8s

## Migration Path (If Already Using Jest)

Most Jest tests work in Vitest with minimal changes:

**Compatible APIs:**
- `describe`, `it`, `test`
- `expect` matchers
- `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- `vi.fn()` (replaces `jest.fn()`)
- `vi.mock()` (replaces `jest.mock()`)

**Breaking changes:**
```javascript
// Jest
jest.fn()
jest.mock('./module')
jest.useFakeTimers()

// Vitest
import { vi } from 'vitest';
vi.fn()
vi.mock('./module')
vi.useFakeTimers()
```

**Auto-migration tool:**
```bash
npx vitest migrate jest
```

## Sources

**HIGH Confidence:**
- [Vitest Official Docs](https://vitest.dev/guide/) - Installation, configuration, API reference
- [Vitest npm](https://www.npmjs.com/package/vitest) - Version 4.0.18, weekly downloads
- [Supertest npm](https://www.npmjs.com/package/supertest) - Version 7.0.0+, Express testing
- [mongodb-memory-server npm](https://www.npmjs.com/package/mongodb-memory-server) - Version 11.0.1
- [mongodb-memory-server GitHub](https://github.com/typegoose/mongodb-memory-server) - Official docs
- [nock GitHub](https://github.com/nock/nock) - Updated January 21, 2026
- [Sinon.js Official Docs](https://sinonjs.org/) - Version 21.0.1
- [Vitest vs Jest Comparison - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/) - Performance benchmarks
- [Happy-DOM GitHub](https://github.com/capricorn86/happy-dom) - DOM simulation performance
- [Stripe Automated Testing Docs](https://docs.stripe.com/automated-testing) - Official testing guidance

**MEDIUM Confidence:**
- [Testing with MongoDB Memory Server - AppSignal Blog](https://blog.appsignal.com/2025/06/18/testing-mongodb-in-node-with-the-mongodb-memory-server.html) - June 2025 tutorial
- [Supertest Testing Guide - TestMu AI](https://www.testmuai.com/blog/supertest/) - Integration testing patterns
- [Testing in 2026: Full Stack Testing Strategies - Nucamp](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies) - Current testing landscape
- [aws-sdk-mock GitHub](https://github.com/dwyl/aws-sdk-mock) - S3 mocking for DigitalOcean Spaces
- [JSDOM vs Happy-DOM - Sean Coughlin Blog](https://blog.seancoughlin.me/jsdom-vs-happy-dom-navigating-the-nuances-of-javascript-testing) - Performance comparison

**Verified from Codebase:**
- `backend/package.json` - Node.js 22.15.0, Express 4.20.0, Mongoose 8.6.1, aws-sdk 2.1693.0
- `frontend/package.json` - Parcel 2.14.4
- `CLAUDE.md` - Monolithic Express architecture, multi-language/currency support

---
*Stack research for: Test Infrastructure (v1.2 Milestone)*
*Researched: 2026-02-04*
*Node.js: 22.15.0*
