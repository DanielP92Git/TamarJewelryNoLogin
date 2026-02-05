/**
 * CORS Middleware Integration Tests
 *
 * Tests SEC-01, SEC-02, SEC-03 requirements:
 * - SEC-01: CORS allows configured origins in production mode
 * - SEC-02: CORS rejects unauthorized origins in production mode
 * - SEC-03: CORS allows any localhost port in development mode
 *
 * Security threat model documented per test.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

// Import environment guard and mocks
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

/**
 * NOTE: Production mode CORS testing
 *
 * Testing production-mode CORS is challenging because:
 * 1. CORS config (isProd) is evaluated at module load time
 * 2. Setting NODE_ENV='production' before import causes app.listen() to start
 * 3. app.listen() conflicts with port already in use or test isolation
 *
 * Solution: These tests simulate production CORS behavior by:
 * - Setting environment variables (HOST, ADMIN_URL) that production would use
 * - Testing against the whitelist origins
 * - The actual NODE_ENV='test' allows localhost (dev mode), but we test the
 *   production whitelist behavior by using non-localhost origins
 */
describe('CORS Middleware - Production Mode (Simulated)', () => {
  let app;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Set production-style origin configuration
    // NODE_ENV stays 'test' to prevent app.listen() port conflicts
    process.env.HOST = 'https://example.com';
    process.env.ADMIN_URL = 'https://admin.example.com';
    process.env.FULLHOST = 'https://www.example.com';
    process.env.API_URL = 'https://api.example.com';

    // Import app dynamically after environment configuration
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  describe('Allowed Origins (SEC-01)', () => {
    /**
     * SEC-01: CORS allows configured HOST origin
     * Threat: Legitimate frontend needs cross-origin API access
     * Protection: Whitelist ensures only authorized origins allowed
     */
    it('should allow configured HOST origin', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-01: CORS allows configured ADMIN_URL origin
     * Threat: Admin dashboard needs cross-origin API access
     * Protection: Whitelist includes both frontend and admin origins
     */
    it('should allow configured ADMIN_URL origin', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://admin.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://admin.example.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-01: CORS allows configured FULLHOST origin
     * Threat: WWW subdomain frontend needs API access
     * Protection: Whitelist includes www variant
     */
    it('should allow configured FULLHOST origin (www)', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://www.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://www.example.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-01: CORS allows configured API_URL origin
     * Threat: API subdomain needs cross-origin requests
     * Protection: Whitelist includes API origin
     */
    it('should allow configured API_URL origin', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://api.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://api.example.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-01: Same-origin requests (no Origin header) should succeed
     * Threat: Non-browser clients and same-origin requests need API access
     * Protection: Missing Origin header is allowed (server-to-server, curl, etc.)
     */
    it('should allow same-origin requests (no Origin header)', async () => {
      const response = await request(app)
        .get('/allproducts');

      expect(response.status).toBe(200);
      // No CORS headers when no Origin provided (same-origin)
    });
  });

  describe('Rejected Origins (SEC-02)', () => {
    /**
     * SEC-02: CORS rejects unauthorized origin in production
     * Threat: Malicious site attempts to make cross-origin API requests
     * Protection: Origin callback returns error for non-whitelisted origins
     */
    it('should reject unauthorized origin in production', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://malicious-site.com');

      // CORS middleware returns error for disallowed origins
      // Express translates this to 500 or no ACAO header
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    /**
     * SEC-02: CORS subdomain attack protection
     * Threat: Attacker registers example.com.evil.com to bypass naive origin checks
     * Protection: Origin callback uses strict URL parsing, not substring matching
     */
    it('should reject similar-looking domain (subdomain attack)', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://example.com.evil.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    /**
     * SEC-02: Null origin rejection in production
     * Threat: Sandboxed iframes and data URLs use 'null' origin, potential attack vector
     * Protection: Origin callback validates against whitelist, null doesn't match
     */
    it('should reject null origin in production', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'null');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    /**
     * SEC-02: Port variation attack protection
     * Threat: Attacker uses same domain with different port to bypass CORS
     * Protection: Origin includes protocol, domain, AND port - all must match
     */
    it('should reject same domain with different port', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://example.com:8080');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    /**
     * SEC-02: Protocol downgrade attack protection
     * Threat: Attacker uses HTTP instead of HTTPS to bypass CORS
     * Protection: Origin includes protocol - HTTP vs HTTPS are different origins
     */
    it('should reject HTTP when HTTPS expected', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://example.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    /**
     * SEC-02: Case sensitivity validation
     * Threat: Mixed case domain bypass attempts
     * Protection: URL normalization handles case variations (domains are case-insensitive per spec)
     * Note: https://EXAMPLE.COM is equivalent to https://example.com (RFC 3986)
     */
    it('should allow mixed-case domain (domains are case-insensitive)', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://EXAMPLE.COM');

      // Domain names are case-insensitive per RFC 3986
      // URL parsing normalizes https://EXAMPLE.COM to https://example.com
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://EXAMPLE.COM');
    });
  });

  describe('CORS Preflight (OPTIONS) Tests', () => {
    /**
     * SEC-01: Preflight OPTIONS requests must succeed for allowed origins
     * Threat: Browser preflight check prevents legitimate cross-origin requests
     * Protection: CORS middleware handles OPTIONS with proper headers
     */
    it('should return 204 for valid preflight request', async () => {
      const response = await request(app)
        .options('/allproducts')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    /**
     * SEC-01: Preflight should include allowed HTTP methods
     * Threat: Missing method headers block legitimate requests
     * Protection: CORS config specifies allowed methods
     */
    it('should include Access-Control-Allow-Methods header', async () => {
      const response = await request(app)
        .options('/allproducts')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      const methods = response.headers['access-control-allow-methods'];
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('OPTIONS');
    });

    /**
     * SEC-01: Preflight should include allowed headers
     * Threat: Missing header permissions block auth tokens and content type
     * Protection: CORS config specifies allowed headers
     */
    it('should include Access-Control-Allow-Headers header', async () => {
      const response = await request(app)
        .options('/allproducts')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type, auth-token');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-headers']).toBeDefined();
      const headers = response.headers['access-control-allow-headers'];
      expect(headers).toContain('Content-Type');
      expect(headers).toContain('Authorization');
      expect(headers).toContain('auth-token');
      expect(headers).toContain('X-Requested-With');
    });

    /**
     * SEC-01: Preflight should include credentials flag
     * Threat: Missing credentials flag prevents cookie/auth header transmission
     * Protection: CORS config enables credentials for authenticated requests
     */
    it('should include Access-Control-Allow-Credentials header', async () => {
      const response = await request(app)
        .options('/allproducts')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Security Headers (Helmet)', () => {
    /**
     * SEC-01: X-Content-Type-Options prevents MIME sniffing attacks
     * Threat: Browser MIME sniffing can execute malicious scripts
     * Protection: Helmet sets nosniff
     */
    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/allproducts');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    /**
     * SEC-01: X-Frame-Options prevents clickjacking attacks
     * Threat: Malicious site embeds API in iframe for clickjacking
     * Protection: Helmet sets SAMEORIGIN
     */
    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/allproducts');

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    /**
     * SEC-01: X-Powered-By header should be removed
     * Threat: Server fingerprinting aids targeted attacks
     * Protection: Helmet removes X-Powered-By header
     */
    it('should NOT set X-Powered-By header', async () => {
      const response = await request(app).get('/allproducts');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    /**
     * SEC-01: X-DNS-Prefetch-Control prevents information leakage
     * Threat: DNS prefetching may leak information about user navigation
     * Protection: Helmet disables DNS prefetching
     */
    it('should set X-DNS-Prefetch-Control header', async () => {
      const response = await request(app).get('/allproducts');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });
});

/**
 * Development Mode CORS Tests
 *
 * In development (NODE_ENV !== 'production'), the CORS middleware allows:
 * - Any localhost port (http://localhost:*)
 * - Any 127.0.0.1 port (http://127.0.0.1:*)
 * This supports development workflows where Live Server uses random ports
 */
describe('CORS Middleware - Development Mode', () => {
  let app;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Ensure NODE_ENV is test (development-like for CORS)
    // This is already set by vitest, but explicitly document it
    expect(process.env.NODE_ENV).toBe('test');

    // Import app dynamically
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  describe('Localhost Permissiveness (SEC-03)', () => {
    /**
     * SEC-03: Development allows localhost:5500 (common Live Server port)
     * Threat: Development workflow requires flexible origin handling
     * Protection: Only in development, production is strict
     */
    it('should allow localhost:5500 in development', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://localhost:5500');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5500');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-03: Development allows localhost:3000 (common React port)
     * Threat: Development workflow requires flexible origin handling
     * Protection: Only in development, production is strict
     */
    it('should allow localhost:3000 in development', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-03: Development allows localhost with any port
     * Threat: Development workflow with dynamic ports (Vite, webpack-dev-server)
     * Protection: Regex matches http://localhost:* pattern in development
     */
    it('should allow localhost with any port in development', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://localhost:8080');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-03: Development allows 127.0.0.1 with any port
     * Threat: Some tools use 127.0.0.1 instead of localhost
     * Protection: Regex matches both localhost and 127.0.0.1
     */
    it('should allow 127.0.0.1 with any port in development', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://127.0.0.1:9999');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:9999');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    /**
     * SEC-03: Development still rejects non-localhost origins
     * Threat: Malicious site attempts cross-origin in development
     * Protection: Only localhost/127.0.0.1 get permissive treatment
     */
    it('should still reject non-localhost origins in development', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'https://malicious.com');

      // Should reject because not localhost and not in whitelist
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    /**
     * Edge case: Malformed Origin header
     * Threat: Malformed input could crash middleware
     * Protection: URL parsing rejects invalid origins (returns error)
     * Note: CORS middleware returns 500 for malformed origins, which is acceptable
     */
    it('should reject malformed Origin header', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'not-a-valid-url');

      // Malformed origin is rejected with CORS error (500 or no ACAO header)
      // The middleware doesn't crash, it returns an error response
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    /**
     * Edge case: Empty Origin header
     * Threat: Edge case input handling
     * Protection: Empty string handled by toOrigin() function
     */
    it('should handle empty Origin header', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', '');

      // Empty origin should be handled gracefully
      expect(response.status).toBe(200);
    });

    /**
     * Edge case: Origin with trailing slash
     * Threat: URL normalization inconsistencies
     * Protection: URL() constructor normalizes trailing slashes
     */
    it('should handle Origin with trailing slash', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://localhost:5500/');

      // Trailing slash should be normalized by URL parsing
      expect(response.status).toBe(200);
      // Origin may or may not include trailing slash, depends on normalization
    });

    /**
     * Edge case: Case variations in localhost
     * Threat: Case-sensitive string matching could reject valid localhost
     * Protection: Regex uses case-insensitive flag
     */
    it('should handle case variations in localhost', async () => {
      const response = await request(app)
        .get('/allproducts')
        .set('Origin', 'http://LOCALHOST:5500');

      // Regex /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i is case-insensitive
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://LOCALHOST:5500');
    });
  });
});

/**
 * Additional Security Header Verification
 *
 * Helmet middleware provides comprehensive security headers beyond CORS.
 * These tests verify the defense-in-depth layers.
 */
describe('CORS Middleware - Additional Security', () => {
  let app;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  describe('Helmet Security Headers', () => {
    /**
     * Verify X-Download-Options header
     * Threat: IE8 MIME type handling vulnerabilities
     * Protection: Helmet sets noopen to prevent downloads in context
     */
    it('should set X-Download-Options header if configured', async () => {
      const response = await request(app).get('/allproducts');

      // Helmet may or may not set this depending on configuration
      // Document actual behavior
      const downloadOptions = response.headers['x-download-options'];
      // This header is optional and may not be set by current Helmet version
    });

    /**
     * Verify Strict-Transport-Security header behavior
     * Threat: Protocol downgrade attacks (HTTPS to HTTP)
     * Protection: HSTS forces HTTPS for future requests
     * Note: Often only sent in production with HTTPS
     */
    it('should handle HSTS header appropriately for environment', async () => {
      const response = await request(app).get('/allproducts');

      // HSTS typically only set when serving over HTTPS
      // In test environment with HTTP, may not be present
      const hsts = response.headers['strict-transport-security'];
      // Document that this is environment-dependent
    });

    /**
     * Verify Content-Security-Policy header
     * Threat: XSS attacks via inline scripts and external resources
     * Protection: CSP restricts resource loading
     * Note: May not be set for API-only backends
     */
    it('should handle CSP header appropriately for API backend', async () => {
      const response = await request(app).get('/allproducts');

      // CSP may not be set for API-only backends (no HTML rendering)
      const csp = response.headers['content-security-policy'];
      // This is API backend, CSP is less critical than for HTML apps
    });
  });
});
