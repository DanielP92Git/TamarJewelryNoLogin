# Phase 11: Authentication & Authorization Tests - Research

**Researched:** 2026-02-04
**Domain:** JWT authentication, bcrypt password hashing, role-based access control (RBAC)
**Confidence:** HIGH

## Summary

Phase 11 requires comprehensive test coverage for JWT authentication and role-based authorization middleware. The existing codebase uses:
- `jsonwebtoken` for token generation/validation
- `bcrypt` for password hashing (callback-based)
- Custom middleware (`authUser`, `fetchUser`, `requireAdmin`)
- Login/signup endpoints with mixed validation approaches

**Key findings:**
- Integration tests via HTTP boundary (supertest) are primary approach for monolithic backend
- Middleware unit tests provide isolation for edge cases
- Mock req/res objects required for unit testing middleware functions
- JWT verification must test signature validation, expiration, and malformed tokens
- bcrypt testing should use lower salt rounds (4-6) to speed up tests without changing production behavior

**Primary recommendation:** Write integration tests first (HTTP endpoints with real middleware chain), then add targeted unit tests for middleware edge cases that are hard to trigger via HTTP.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsonwebtoken | 9.0.2 | JWT generation and validation | Official Auth0 implementation, industry standard |
| bcrypt | 5.1.1 | Password hashing with automatic salt generation | OWASP-recommended, CPU-intensive hashing for security |
| supertest | 7.2.2 | HTTP integration testing | De facto standard for Express API testing |
| vitest | 4.0.18 | Test runner | Modern, fast, Jest-compatible API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mongodb-memory-server | 11.0.1 | In-memory test database | Already configured in Phase 10 |
| vitest mocking | built-in | Mock req/res for unit tests | Unit testing middleware in isolation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsonwebtoken | jose (modern ESM library) | jose is more modern but jsonwebtoken is already in use |
| bcrypt | argon2 | argon2 is more modern but bcrypt is battle-tested and already in use |
| supertest | node-fetch/axios | supertest integrates better with Express for testing |

**Installation:**
```bash
# Already installed from Phase 10
npm install --save-dev vitest supertest mongodb-memory-server
```

## Architecture Patterns

### Recommended Test File Structure
```
backend/tests/
├── integration/
│   ├── auth.integration.test.js       # Login/signup endpoints
│   └── auth-protected.integration.test.js  # Protected routes
├── unit/
│   ├── middleware/
│   │   ├── authUser.test.js           # Unit test authUser middleware
│   │   ├── fetchUser.test.js          # Unit test fetchUser middleware
│   │   └── requireAdmin.test.js       # Unit test requireAdmin middleware
│   └── helpers/
│       └── tokenHelpers.test.js       # JWT generation/validation helpers
└── helpers/
    └── authHelpers.js                 # Shared helpers for creating tokens, users
```

### Pattern 1: Integration Tests via HTTP Boundary
**What:** Test authentication by making actual HTTP requests to login/signup endpoints
**When to use:** Primary testing approach for authentication flows
**Example:**
```javascript
// Source: Sample integration test from Phase 10 + research synthesis
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Users } from '../../models/index.js';
import { createUser } from '../helpers/factories.js';

describe('POST /login', () => {
  let app;

  beforeEach(async () => {
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  it('should return JWT token for valid credentials', async () => {
    // Create user with known password
    const userData = createUser({
      email: 'test@example.com',
      password: await bcrypt.hash('TestPassword123', 10)
    });
    await new Users(userData).save();

    // Attempt login
    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123'
      })
      .expect(200);

    // Verify response contains valid JWT
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();

    // Verify token can be decoded
    const decoded = jwt.verify(response.body.token, process.env.JWT_KEY);
    expect(decoded.user.email).toBe('test@example.com');
  });

  it('should return 401 for invalid password', async () => {
    const userData = createUser({
      email: 'test@example.com',
      password: await bcrypt.hash('correctPassword', 10)
    });
    await new Users(userData).save();

    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'wrongPassword'
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.token).toBeUndefined();
  });
});
```

### Pattern 2: Testing Protected Routes with JWT
**What:** Test that authenticated routes accept valid tokens and reject invalid ones
**When to use:** For any endpoint that uses fetchUser or requireAdmin middleware
**Example:**
```javascript
// Source: Research synthesis from supertest auth testing patterns
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createUser } from '../helpers/factories.js';

describe('Protected Route Authentication', () => {
  let app;
  let validToken;
  let adminToken;

  beforeEach(async () => {
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Create regular user and generate token
    const user = await new Users(createUser()).save();
    validToken = jwt.sign(
      { user: { id: user._id.toString(), email: user.email, userType: 'user' } },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );

    // Create admin user and generate token
    const admin = await new Users(createUser({ userType: 'admin' })).save();
    adminToken = jwt.sign(
      { user: { id: admin._id.toString(), email: admin.email, userType: 'admin' } },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  });

  it('should allow access with valid token', async () => {
    const response = await request(app)
      .get('/protected-endpoint')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/protected-endpoint')
      .expect(401);

    expect(response.body.errors).toContain('authenticate');
  });

  it('should reject expired token', async () => {
    // Create expired token (expires immediately)
    const expiredToken = jwt.sign(
      { user: { id: 'test-id', email: 'test@example.com' } },
      process.env.JWT_KEY,
      { expiresIn: '-1s' } // Already expired
    );

    const response = await request(app)
      .get('/protected-endpoint')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should allow admin access to admin routes', async () => {
    await request(app)
      .post('/addproduct')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Product', category: 'test' })
      .expect(200);
  });

  it('should reject regular user from admin routes', async () => {
    const response = await request(app)
      .post('/addproduct')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Test Product', category: 'test' })
      .expect(403);

    expect(response.body.errors).toContain('Admin');
  });
});
```

### Pattern 3: Unit Testing Middleware in Isolation
**What:** Test middleware functions directly with mock req/res objects
**When to use:** For edge cases hard to trigger via HTTP (malformed tokens, database errors)
**Example:**
```javascript
// Source: Express middleware testing patterns from research
import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { fetchUser } from '../../middleware/auth.js';

describe('fetchUser middleware', () => {
  it('should attach user to req.user for valid token', async () => {
    // Mock request with valid token
    const mockReq = {
      header: vi.fn((name) => {
        if (name === 'authorization') {
          return `Bearer ${validToken}`;
        }
        return null;
      })
    };

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    const mockNext = vi.fn();

    // Create valid user in DB
    const user = await new Users(createUser()).save();
    const validToken = jwt.sign(
      { user: { id: user._id.toString() } },
      process.env.JWT_KEY
    );

    // Execute middleware
    await fetchUser(mockReq, mockRes, mockNext);

    // Verify user attached and next called
    expect(mockReq.user).toBeDefined();
    expect(mockReq.user.id).toBe(user._id.toString());
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 401 for malformed token', async () => {
    const mockReq = {
      header: vi.fn(() => 'Bearer malformed-token-here')
    };

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    const mockNext = vi.fn();

    await fetchUser(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
```

### Pattern 4: Testing Password Hashing and Validation
**What:** Test bcrypt hash generation and comparison
**When to use:** For signup endpoint and authUser middleware tests
**Example:**
```javascript
// Source: bcrypt testing patterns from research
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';

describe('Password Hashing', () => {
  it('should generate unique salts for identical passwords', async () => {
    const password = 'TestPassword123';

    // Hash same password twice
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);

    // Hashes should be different (different salts)
    expect(hash1).not.toBe(hash2);

    // Both should validate against original password
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'correctPassword';
    const hash = await bcrypt.hash(password, 10);

    const result = await bcrypt.compare('wrongPassword', hash);
    expect(result).toBe(false);
  });

  it('should use lower salt rounds in tests for speed', async () => {
    // Production uses 10 rounds, tests can use 4-6 for speed
    const testSaltRounds = 4;
    const startTime = Date.now();

    await bcrypt.hash('TestPassword123', testSaltRounds);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // Should be fast in tests
  });
});
```

### Anti-Patterns to Avoid
- **Using jwt.decode() instead of jwt.verify():** decode() does NOT validate signature - always use verify()
- **Testing only success paths:** Must test 401 (unauthenticated), 403 (unauthorized), expired tokens, malformed tokens
- **High bcrypt salt rounds in tests:** Production uses 10, tests should use 4-6 to avoid slow tests
- **Not testing token expiration:** Expired tokens must be rejected
- **Shallow assertions:** Don't just test .expect(200), verify response body and JWT payload

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT token generation/validation | Custom JWT implementation | jsonwebtoken library | Handles signature algorithms, expiration, claims validation |
| Password hashing | Custom hash function or MD5/SHA | bcrypt (already in use) | Automatically generates salts, intentionally slow to resist brute force |
| Mock req/res objects | Manual object construction | Vitest's vi.fn() with mockReturnThis() | Chainable mocks for Express patterns |
| Test token creation | Copying production token logic | Helper function createAuthToken() | Centralized, consistent test tokens |
| User creation in tests | Manual User model construction | Factory pattern (already exists) | Unique data, consistent structure |

**Key insight:** Authentication security comes from battle-tested libraries. Focus tests on integration (correct usage of libraries) not reimplementation of crypto.

## Common Pitfalls

### Pitfall 1: Algorithm Confusion Attack (None Algorithm)
**What goes wrong:** JWT accepts tokens with `alg: "none"` (no signature)
**Why it happens:** Some JWT libraries accept unsigned tokens if algorithm is "none"
**How to avoid:** Always explicitly verify algorithm in jwt.verify() options
**Warning signs:** Tests pass without actual token signature validation
**Test for this:**
```javascript
it('should reject tokens with "none" algorithm', async () => {
  // Create unsigned token with alg: none
  const unsignedToken = Buffer.from(JSON.stringify({
    alg: 'none',
    typ: 'JWT'
  })).toString('base64') + '.' +
  Buffer.from(JSON.stringify({
    user: { id: 'fake-id', email: 'fake@example.com' }
  })).toString('base64') + '.';

  const response = await request(app)
    .get('/protected-endpoint')
    .set('Authorization', `Bearer ${unsignedToken}`)
    .expect(401);
});
```

### Pitfall 2: Testing Against Production Database
**What goes wrong:** Tests modify real user data or leak credentials
**Why it happens:** Forgot to set NODE_ENV=test, used wrong connection string
**How to avoid:** envGuard validates environment before tests (already implemented in Phase 10)
**Warning signs:** Test failures affect production, unexpected user records appear
**Prevention already in place:** Phase 10's envGuard.js validates no production MongoDB URL

### Pitfall 3: Missing Token Expiration Validation
**What goes wrong:** Expired tokens are accepted, security breach
**Why it happens:** jwt.verify() must be called (not jwt.decode()), expiration checking is opt-in
**How to avoid:** Always use jwt.verify() with proper secret, test expired tokens
**Warning signs:** Old tokens still work after logout or timeout
**Test for this:**
```javascript
it('should reject expired token', async () => {
  const expiredToken = jwt.sign(
    { user: { id: 'test', email: 'test@example.com' } },
    process.env.JWT_KEY,
    { expiresIn: '-1s' } // Expired 1 second ago
  );

  const response = await request(app)
    .get('/protected-endpoint')
    .set('Authorization', `Bearer ${expiredToken}`)
    .expect(401);
});
```

### Pitfall 4: Callback Hell with bcrypt
**What goes wrong:** Tests become nested callbacks, hard to read and debug
**Why it happens:** Existing code uses bcrypt callback API (bcrypt.compare in authUser)
**How to avoid:** Use promise/async-await versions in tests (bcrypt supports both)
**Warning signs:** Deeply nested test code, hard to follow async flow
**Solution:**
```javascript
// BAD: Callback style
bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    // handle error in callback
  }
  // test assertions in callback
});

// GOOD: Promise/async-await style
const result = await bcrypt.compare(password, hash);
expect(result).toBe(true);
```

### Pitfall 5: Not Testing 401 vs 403 Distinction
**What goes wrong:** Using wrong status code for authentication vs authorization failures
**Why it happens:** Confusion about when to use 401 (not authenticated) vs 403 (authenticated but forbidden)
**How to avoid:** 401 = missing/invalid credentials, 403 = valid credentials but insufficient permissions
**Warning signs:** Tests pass but API consumers get confusing error codes
**Test for this:**
```javascript
it('should return 401 when no token provided', async () => {
  await request(app)
    .get('/protected-endpoint')
    .expect(401); // Not authenticated
});

it('should return 403 when regular user accesses admin route', async () => {
  await request(app)
    .post('/addproduct')
    .set('Authorization', `Bearer ${regularUserToken}`)
    .expect(403); // Authenticated but forbidden
});
```

### Pitfall 6: Weak or Hardcoded JWT Secrets in Tests
**What goes wrong:** Tests use 'test-secret' which leaks to production or CI
**Why it happens:** Convenience of simple test secrets
**How to avoid:** Set JWT_KEY in test environment, use sufficiently complex secret even in tests
**Warning signs:** Tests fail in CI, security scanners flag weak secrets
**Solution already in place:** tests/setup.js should set process.env.JWT_KEY to complex value

## Code Examples

Verified patterns from official sources and project inspection:

### Creating Test Users with Hashed Passwords
```javascript
// Source: backend/tests/helpers/factories.js
import { createUser, createAdmin } from '../helpers/factories.js';

// Factory automatically hashes password with bcrypt
const regularUser = createUser({
  email: 'test@example.com',
  password: 'plaintext' // Will be hashed by factory
});

const adminUser = createAdmin({
  email: 'admin@example.com'
});

await new Users(regularUser).save();
await new Users(adminUser).save();
```

### Testing Login Endpoint with Field Validation
```javascript
// Source: backend/index.js lines 1594-1643
describe('POST /signup', () => {
  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/signup')
      .send({
        // Missing password
        email: 'test@example.com',
        username: 'testuser'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toContain('Invalid signup payload');
  });

  it('should reject duplicate email', async () => {
    const userData = createUser({ email: 'test@example.com' });
    await new Users(userData).save();

    const response = await request(app)
      .post('/signup')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123',
        username: 'testuser'
      })
      .expect(400);

    expect(response.body.errors).toContain('Existing user');
  });
});
```

### Testing Token with Multiple Header Formats
```javascript
// Source: backend/middleware/auth.js lines 6-15
describe('Token Header Formats', () => {
  it('should accept auth-token header', async () => {
    await request(app)
      .get('/protected-endpoint')
      .set('auth-token', validToken)
      .expect(200);
  });

  it('should accept Authorization: Bearer token', async () => {
    await request(app)
      .get('/protected-endpoint')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('should reject malformed Authorization header', async () => {
    await request(app)
      .get('/protected-endpoint')
      .set('Authorization', validToken) // Missing "Bearer" prefix
      .expect(401);
  });
});
```

### Helper Function for Creating Valid Test Tokens
```javascript
// Source: Research synthesis + project patterns
// File: tests/helpers/authHelpers.js
import jwt from 'jsonwebtoken';

/**
 * Create valid JWT token for testing
 * @param {Object} userDoc - MongoDB user document
 * @param {Object} options - jwt.sign options
 * @returns {string} Valid JWT token
 */
export function createAuthToken(userDoc, options = {}) {
  const payload = {
    user: {
      id: userDoc._id.toString(),
      email: userDoc.email,
      userType: userDoc.userType
    }
  };

  return jwt.sign(payload, process.env.JWT_KEY, {
    expiresIn: '1h',
    ...options
  });
}

/**
 * Create expired token for testing
 */
export function createExpiredToken(userDoc) {
  return createAuthToken(userDoc, { expiresIn: '-1s' });
}

/**
 * Create token with invalid signature
 */
export function createInvalidToken(userDoc) {
  return jwt.sign(
    { user: { id: userDoc._id.toString() } },
    'wrong-secret-key'
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest | Vitest | 2021-2022 | 10-20x faster tests, better ESM support |
| Callback-based bcrypt | Promise/async-await bcrypt | 2020+ | Cleaner test code, better error handling |
| Separate test/mock libraries | Vitest built-in mocking | 2021+ | Fewer dependencies, unified API |
| jwt.decode() without verification | jwt.verify() with signature check | Always use verify | Critical security requirement |
| Hard-coded test secrets | Environment-based secrets | Best practice | Prevents credential leakage |

**Deprecated/outdated:**
- **Passport.js for simple JWT auth**: Overkill for this project's simple auth needs, jsonwebtoken is sufficient
- **Mocha + Chai + Sinon**: Replaced by Vitest's all-in-one solution
- **jwt.decode()**: Never validates signature, use jwt.verify() instead

## Open Questions

Things that couldn't be fully resolved:

1. **JWT_KEY in test environment**
   - What we know: setup.js should set process.env.JWT_KEY for tests
   - What's unclear: Current test JWT_KEY value, whether it's sufficiently complex
   - Recommendation: Verify tests/setup.js sets JWT_KEY to non-trivial value (32+ chars)

2. **JWT_EXPIRES_IN configuration**
   - What we know: Backend uses process.env.JWT_EXPIRES_IN || '1h'
   - What's unclear: Whether tests should use shorter expiration for faster testing
   - Recommendation: Tests can override with shorter expiration (e.g., '5m') for speed

3. **bcrypt salt rounds in tests**
   - What we know: Production uses 10 rounds, tests should use 4-6 for speed
   - What's unclear: Whether factories.js already uses lower rounds for tests
   - Recommendation: Check factories.js bcrypt.hashSync() - if using 10, reduce to 6 for tests

4. **Existing authUser middleware callback style**
   - What we know: authUser uses bcrypt.compare with callbacks (index.js line 24)
   - What's unclear: Whether to refactor to promises for testing or test as-is
   - Recommendation: Test as-is (integration tests work with callbacks), consider refactor in future phase

## Sources

### Primary (HIGH confidence)
- Backend implementation:
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\middleware\auth.js
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js (login/signup endpoints)
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\models\User.js
- Phase 10 test infrastructure:
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\setup.js
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\helpers\factories.js
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\helpers\envGuard.js
  - C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\integration\sample.integration.test.js

### Secondary (MEDIUM confidence)
- [jsonwebtoken npm documentation](https://www.npmjs.com/package/jsonwebtoken) - JWT sign/verify API
- [bcrypt npm documentation](https://www.npmjs.com/package/bcrypt) - Password hashing API
- [Integration Testing Node.js APIs with Jest and Supertest](https://blog.alexrusin.com/integration-testing-node-js-apis-with-jest-and-supertest/) - Integration testing patterns
- [Testing Express.js endpoints with supertest](https://traveling-coderman.net/code/node-architecture/testing-endpoints/) - Supertest patterns
- [How to Unit Test Express Middleware](https://plainenglish.io/blog/how-to-unit-test-express-middleware-typescript-jest-c6a7ad166e74) - Middleware testing patterns
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html) - Vitest mock API

### Tertiary (LOW confidence - WebSearch only)
- [JWT Vulnerabilities List: 2026 Security Risks](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide) - Security pitfalls
- [JWT Security Best Practices](https://curity.io/resources/learn/jwt-best-practices/) - Security patterns
- [7 Ways to Avoid API Security Pitfalls when using JWT](https://42crunch.com/7-ways-to-avoid-jwt-pitfalls/) - Common mistakes
- [Testing JSON Web Tokens - OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens) - Security testing
- [Hashing in Action: Understanding bcrypt](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/) - bcrypt fundamentals
- [npm bcrypt in 2026: Password Hashing That Fails Closed](https://thelinuxcode.com/npm-bcrypt-in-2026-password-hashing-that-fails-closed-and-how-to-ship-it-safely/) - Modern bcrypt usage
- [401 vs 403: Key Differences](https://cyberpanel.net/blog/401-vs-403) - HTTP status codes
- [Role-Based Access Control in Node.js and Express](https://permify.co/post/role-based-access-control-rbac-nodejs-expressjs/) - RBAC patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured in Phase 10
- Architecture: HIGH - Integration + unit test patterns are well-established
- Pitfalls: HIGH - Security vulnerabilities documented by OWASP, Auth0, and security researchers
- bcrypt async/sync: MEDIUM - Recommendation based on documentation, but codebase uses callback style
- JWT testing specifics: HIGH - Direct inspection of backend/middleware/auth.js implementation

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - authentication patterns are stable)
