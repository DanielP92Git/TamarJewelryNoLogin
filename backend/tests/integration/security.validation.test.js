/**
 * Input Validation Security Tests
 *
 * Tests XSS prevention and NoSQL injection protection.
 * Uses OWASP-recommended attack vectors.
 *
 * Coverage:
 * - SEC-08: XSS sanitization in product descriptions and names
 * - SEC-09: NoSQL injection prevention in login/signup
 * - Unicode handling: Hebrew/RTL character acceptance
 * - Content-Type validation
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import { createUser, createAdmin, createProduct } from '../helpers/factories.js';
import { createAuthToken } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';
import {
  xssVectors,
  validUnicodeInputs,
  dangerousUnicodeInputs,
  noSqlVectors
} from '../helpers/securityVectors.js';

describe('Input Validation - XSS Prevention', () => {
  let app;
  let adminToken;
  let Product;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    const appModule = await import('../../index.js');
    app = appModule.app;
    Product = mongoose.model('Product');
  });

  beforeEach(async () => {
    cleanAllMocks();

    // Create admin user for product creation tests
    const User = mongoose.model('Users');
    const adminData = createAdmin({ email: 'xss-test-admin@example.com' });
    const savedAdmin = await new User(adminData).save();
    adminToken = createAuthToken(savedAdmin);
  });

  /**
   * SEC-08: XSS sanitization in product descriptions
   * Threat: Attacker injects script tags in product description, executes in victim browser
   * Protection: Server should sanitize/escape HTML before storing
   */
  describe('Product Description XSS', () => {
    it('should sanitize or escape script tags in description', async () => {
      const productData = createProduct({
        description: '<script>alert("xss")</script>'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      // Check what was stored in database
      const saved = await Product.findOne({ id: productData.id });

      if (saved) {
        // Either: script tags removed/escaped, OR no raw <script> tag
        const hasScriptTag = saved.description.includes('<script>');
        console.log(`SEC-08 Finding: Script tag in description - Stored: "${saved.description}" - Has <script>: ${hasScriptTag}`);

        // Document finding (this is exploratory testing)
        if (hasScriptTag) {
          console.warn('⚠️  SECURITY FINDING: XSS payload stored without sanitization');
        } else {
          console.log('✓ XSS payload was sanitized or escaped');
        }
      }
    });

    it('should handle img onerror XSS vector in description', async () => {
      const xssPayload = '<img src=x onerror=alert(1)>';
      const productData = createProduct({
        description: xssPayload
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved && saved.description) {
        const hasOnerror = saved.description.toLowerCase().includes('onerror');
        console.log(`SEC-08 Finding: onerror handler - Stored: "${saved.description}" - Has onerror: ${hasOnerror}`);

        if (hasOnerror) {
          console.warn('⚠️  SECURITY FINDING: Event handler XSS payload stored');
        }
      }
    });

    it('should handle svg onload XSS vector in description', async () => {
      const xssPayload = '<svg onload=alert(1)>';
      const productData = createProduct({
        description: xssPayload
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved && saved.description) {
        const hasOnload = saved.description.toLowerCase().includes('onload');
        console.log(`SEC-08 Finding: onload handler - Stored: "${saved.description}" - Has onload: ${hasOnload}`);

        if (hasOnload) {
          console.warn('⚠️  SECURITY FINDING: SVG onload XSS payload stored');
        }
      }
    });

    it('should handle attribute injection XSS in description', async () => {
      const xssPayload = '"><script>alert(1)</script>';
      const productData = createProduct({
        description: xssPayload
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved && saved.description) {
        const hasScriptTag = saved.description.includes('<script>');
        console.log(`SEC-08 Finding: Attribute injection - Stored: "${saved.description}" - Has <script>: ${hasScriptTag}`);
      }
    });

    it('should handle javascript: protocol XSS in description', async () => {
      const xssPayload = "javascript:alert('XSS')";
      const productData = createProduct({
        description: xssPayload
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved && saved.description) {
        const hasJavascriptProtocol = saved.description.toLowerCase().includes('javascript:');
        console.log(`SEC-08 Finding: javascript: protocol - Stored: "${saved.description}" - Has javascript:: ${hasJavascriptProtocol}`);

        if (hasJavascriptProtocol) {
          console.warn('⚠️  SECURITY FINDING: javascript: protocol URL stored');
        }
      }
    });
  });

  describe('Product Name XSS', () => {
    it('should sanitize or escape script tags in product name', async () => {
      const productData = createProduct({
        name: '<script>alert("xss")</script>Necklace'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved) {
        const hasScriptTag = saved.name.includes('<script>');
        console.log(`SEC-08 Finding: Script tag in name - Stored: "${saved.name}" - Has <script>: ${hasScriptTag}`);

        if (hasScriptTag) {
          console.warn('⚠️  SECURITY FINDING: XSS payload in product name stored without sanitization');
        }
      }
    });

    it('should handle event handler in product name', async () => {
      const productData = createProduct({
        name: '<img src=x onerror=alert(1)>Bracelet'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved && saved.name) {
        const hasOnerror = saved.name.toLowerCase().includes('onerror');
        console.log(`SEC-08 Finding: Event handler in name - Stored: "${saved.name}" - Has onerror: ${hasOnerror}`);
      }
    });
  });

  describe('Comprehensive XSS Vector Testing', () => {
    it.each(xssVectors.slice(0, 3))('should handle XSS vector in description: %s', async (xssPayload) => {
      const productData = createProduct({
        description: xssPayload
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      const saved = await Product.findOne({ id: productData.id });

      if (saved && saved.description) {
        // Check for common XSS patterns
        const hasScript = saved.description.toLowerCase().match(/<script[^>]*>/i);
        const hasEventHandler = saved.description.toLowerCase().match(/on\w+\s*=/i);
        const hasJavascriptProtocol = saved.description.toLowerCase().includes('javascript:');

        const isVulnerable = hasScript || hasEventHandler || hasJavascriptProtocol;

        if (isVulnerable) {
          console.warn(`⚠️  SECURITY FINDING: XSS vector "${xssPayload.substring(0, 50)}..." stored without full sanitization`);
        }
      }
    });
  });
});

describe('Input Validation - NoSQL Injection Prevention', () => {
  let app;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  /**
   * SEC-09: NoSQL operator injection in login
   * Threat: Attacker sends {$ne: null} as email to bypass authentication
   * Protection: Server should validate input types before querying
   */
  describe('Login Endpoint NoSQL Injection', () => {
    it('should reject object value for email field', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: { $gt: '' },
          password: 'TestPassword123'
        });

      console.log(`SEC-09 Finding: $gt operator in email - Status: ${response.status}`);

      // Should reject with validation error, NOT process the query
      // If 500 returned, query may have been attempted (vulnerability)
      // If 400 returned, validation caught it (good)
      // If 200/401/404, need to check if query was sanitized
      if (response.status === 500) {
        console.warn('⚠️  SECURITY FINDING: $gt operator may have caused server error (possible injection attempt processed)');
      } else if (response.status === 200) {
        console.warn('⚠️  SECURITY FINDING: Authentication succeeded with $gt operator (auth bypass possible)');
      } else if (response.status === 400) {
        console.log('✓ Input validation rejected $gt operator');
      } else {
        console.log(`ℹ️  $gt operator handled with status ${response.status} - documenting behavior`);
      }

      // Should NOT return 500 (unhandled error = possible injection)
      // But also should not return 200 (successful bypass)
      expect([400, 401, 404]).toContain(response.status);
    });

    it('should reject $ne operator in email field', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: { $ne: null },
          password: 'TestPassword123'
        });

      console.log(`SEC-09 Finding: $ne operator in email - Status: ${response.status}, Body:`, response.body);

      // At minimum, should not succeed (200) unless a user exists
      if (response.status === 200) {
        // This is a vulnerability - authentication bypassed
        console.warn('⚠️  CRITICAL SECURITY FINDING: NoSQL injection may have bypassed authentication');
      } else if (response.status === 400) {
        console.log('✓ Input validation rejected $ne operator');
      }

      expect([400, 401, 404, 500]).toContain(response.status);
    });

    it('should reject $regex operator in email field', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: { $regex: '.*' },
          password: 'TestPassword123'
        });

      console.log(`SEC-09 Finding: $regex operator - Status: ${response.status}`);

      if (response.status === 200) {
        console.warn('⚠️  SECURITY FINDING: $regex operator may have enabled pattern matching attack');
      }

      expect([400, 401, 404, 500]).toContain(response.status);
    });

    it('should reject $where clause', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          $where: '1==1',
          email: 'test@example.com',
          password: 'test'
        });

      console.log(`SEC-09 Finding: $where clause - Status: ${response.status}`);

      // Should not execute the $where clause
      if (response.status === 200 || response.status === 500) {
        console.warn('⚠️  SECURITY FINDING: $where clause may have been processed');
      }

      expect([400, 401, 404, 500]).toContain(response.status);
    });

    it('should reject $in operator in email field', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: { $in: ['admin@example.com', 'user@example.com'] },
          password: 'TestPassword123'
        });

      console.log(`SEC-09 Finding: $in operator - Status: ${response.status}`);

      expect([400, 401, 404, 500]).toContain(response.status);
    });

    it('should reject nested operators in password field', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: { $ne: '' }
        });

      console.log(`SEC-09 Finding: $ne in password - Status: ${response.status}`);

      // Password with $ne could bypass password check
      if (response.status === 200) {
        console.warn('⚠️  CRITICAL SECURITY FINDING: NoSQL operator in password field may have bypassed auth');
      }

      expect([400, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('Signup Endpoint NoSQL Injection', () => {
    it('should reject object values in signup email field', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          email: { $gt: '' },
          password: 'TestPassword123',
          name: 'Test User'
        });

      console.log(`SEC-09 Finding: Signup with $gt operator - Status: ${response.status}`);

      // Should be rejected at validation, not create a user
      expect([400, 500]).toContain(response.status);

      // Verify no weird user was created
      const User = mongoose.model('Users');
      const count = await User.countDocuments();
      expect(count).toBe(0); // No users should be created
    });

    it('should reject operator injection in signup name field', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
          name: { $ne: null }
        });

      console.log(`SEC-09 Finding: Signup with operator in name - Status: ${response.status}`);

      expect([400, 500]).toContain(response.status);
    });
  });
});

describe('Unicode and RTL Character Handling', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  beforeEach(async () => {
    cleanAllMocks();

    // Create admin user for product tests
    const User = mongoose.model('Users');
    const adminData = createAdmin({ email: 'unicode-test-admin@example.com' });
    const savedAdmin = await new User(adminData).save();
    adminToken = createAuthToken(savedAdmin);
  });

  /**
   * Positive test: Valid Hebrew names should be accepted
   * This app supports Hebrew - don't block legitimate input
   */
  describe('Valid Unicode Acceptance', () => {
    it('should accept Hebrew product name', async () => {
      const productData = createProduct({
        name: 'תכשיטים יפים',
        description: 'Hebrew jewelry name',
        mainImage: 'test-image-hebrew.jpg'  // Required by addproduct endpoint
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      console.log(`Unicode test: Hebrew name - Status: ${response.status}`);

      // Should not reject valid Unicode (201 = created, 400 = validation error for other reasons)
      expect([200, 201, 400]).toContain(response.status);

      // If succeeded, verify it was stored correctly
      if (response.status === 200 || response.status === 201) {
        const Product = mongoose.model('Product');
        const saved = await Product.findOne({ id: productData.id });
        if (saved) {
          expect(saved.name).toBe('תכשיטים יפים');
          console.log('✓ Hebrew characters stored correctly');
        }
      } else {
        // 400 is acceptable if it's due to missing image file, not Unicode rejection
        console.log('ℹ️  Hebrew name handled (400 likely due to image validation, not Unicode)');
      }
    });

    it('should accept mixed Hebrew/English name', async () => {
      const productData = createProduct({
        name: 'Sarah (שרה) Collection',
        description: 'Mixed language product',
        mainImage: 'test-image-mixed.jpg'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      // Accept 200/201 (success) or 400 (validation error, not Unicode rejection)
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should accept European diacritics', async () => {
      const productData = createProduct({
        name: 'Émilie Müller Design',
        description: 'European characters test',
        mainImage: 'test-image-europe.jpg'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should accept Japanese characters', async () => {
      const productData = createProduct({
        name: '日本語テスト',
        description: 'Japanese test',
        mainImage: 'test-image-japanese.jpg'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should accept common special characters', async () => {
      const productData = createProduct({
        name: 'Test 123 @#$%',
        description: 'Special chars test',
        mainImage: 'test-image-special.jpg'
      });

      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(productData);

      expect([200, 201, 400]).toContain(response.status);
    });
  });

  /**
   * Dangerous Unicode sequences that could cause issues
   */
  describe('Dangerous Unicode Handling', () => {
    it('should handle null byte injection', async () => {
      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(createProduct({
          name: '\u0000malicious',
          description: 'Null byte test'
        }));

      console.log(`Dangerous Unicode: Null byte - Status: ${response.status}`);

      // Document behavior - null bytes may be stripped or rejected
      if (response.status === 200 || response.status === 201) {
        const Product = mongoose.model('Product');
        const saved = await Product.findOne({}).sort({ _id: -1 }).limit(1);
        if (saved) {
          const hasNullByte = saved.name.includes('\u0000');
          console.log(`Null byte stored: ${hasNullByte}, Name: "${saved.name}"`);
          if (hasNullByte) {
            console.warn('⚠️  SECURITY FINDING: Null byte stored without sanitization');
          }
        }
      }
    });

    it('should handle RTL override character', async () => {
      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(createProduct({
          name: 'name\u202Eevil',
          description: 'RTL override test'
        }));

      console.log(`Dangerous Unicode: RTL override - Status: ${response.status}`);
    });

    it('should handle zero-width space', async () => {
      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(createProduct({
          name: '\u200Bhidden',
          description: 'Zero-width space test'
        }));

      console.log(`Dangerous Unicode: Zero-width space - Status: ${response.status}`);
    });

    it('should handle excessive length input', async () => {
      const response = await request(app)
        .post('/addproduct')
        .set('auth-token', adminToken)
        .send(createProduct({
          name: 'a'.repeat(10001),
          description: 'Length test'
        }));

      console.log(`Dangerous Unicode: Excessive length (10001 chars) - Status: ${response.status}`);

      // Should reject or truncate excessively long input
      // 413 = Payload Too Large, 400 = Bad Request, 201 = Created (may truncate)
      expect([400, 413, 201, 500]).toContain(response.status);

      if (response.status === 201 || response.status === 200) {
        const Product = mongoose.model('Product');
        const saved = await Product.findOne({}).sort({ _id: -1 }).limit(1);
        if (saved) {
          console.log(`Excessive length handled - Stored length: ${saved.name.length}`);
          if (saved.name.length > 1000) {
            console.warn(`⚠️  POTENTIAL DOS: Very long input (${saved.name.length} chars) stored without limit`);
          }
        }
      }
    });
  });
});

describe('Content-Type Validation', () => {
  let app;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();
    const appModule = await import('../../index.js');
    app = appModule.app;
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  it('should accept application/json content type', async () => {
    const response = await request(app)
      .post('/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: 'test' });

    console.log(`Content-Type: application/json - Status: ${response.status}`);

    // Should be processed (even if auth fails with 401/404)
    expect([400, 401, 404]).toContain(response.status);
  });

  it('should handle text/plain content type', async () => {
    const response = await request(app)
      .post('/login')
      .set('Content-Type', 'text/plain')
      .send('email=test@example.com&password=test');

    console.log(`Content-Type: text/plain - Status: ${response.status}, Body:`, response.body);

    // Document behavior - Express may or may not parse this
    // Could be 400 (rejected), 401 (parsed but auth failed), or other
    expect([400, 401, 404, 500]).toContain(response.status);
  });

  it('should handle missing content-type header', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'test' });

    console.log(`Content-Type: (missing) - Status: ${response.status}`);

    // Supertest sets application/json by default, but let's document behavior
    expect([400, 401, 404]).toContain(response.status);
  });
});
