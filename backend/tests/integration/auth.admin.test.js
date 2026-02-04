/**
 * Integration tests for requireAdmin middleware.
 * Tests admin-protected endpoints to verify role-based access control.
 *
 * Key behaviors:
 * - Admin users can access admin routes
 * - Regular users get 403 Forbidden
 * - Unauthenticated requests get 401 Unauthorized
 * - fetchUser middleware runs before requireAdmin (401 before 403)
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createUser, createAdmin, createProduct } from '../helpers/factories.js';
import { createAuthToken, createExpiredToken, createInvalidToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

// Ensure JWT_KEY is set
process.env.JWT_KEY = TEST_JWT_KEY;

describe('requireAdmin middleware', () => {
  let app;
  let User;
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;

  beforeAll(async () => {
    // Validate test environment (prevents production contamination)
    validateTestEnvironment();

    // Disable real network requests
    disableNetConnect();

    // Import app after environment is configured
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get User model
    User = mongoose.model('Users');
  });

  beforeEach(async () => {
    // Clean mocks from previous tests
    cleanAllMocks();

    // Create test users
    adminUser = await User.create(createAdmin());
    adminToken = createAuthToken(adminUser);

    regularUser = await User.create(createUser());
    regularToken = createAuthToken(regularUser);
  });

  describe('Admin access (200)', () => {
    it('should allow admin user to access admin routes', async () => {
      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Admin should be allowed (may fail for other reasons like validation,
      // but should NOT get 403)
      expect(response.status).not.toBe(403);
      expect(response.body.errors).not.toMatch(/admin access required/i);
    });

    it('should allow admin to perform admin actions on /addproduct', async () => {
      const productData = {
        name: 'Test Product',
        category: 'necklaces',
        ils_price: 100,
        description: 'Test description',
        quantity: 5,
        sku: 'TEST001',
        mainImage: {
          desktop: 'test-desktop.jpg',
          mobile: 'test-mobile.jpg'
        },
        smallImages: []
      };

      const response = await request(app)
        .post('/addproduct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      // Should not get 403 (admin is authorized)
      expect(response.status).not.toBe(403);
      // If there are errors, they should not be about admin access
      if (response.body.errors) {
        expect(response.body.errors).not.toMatch(/admin access required/i);
      }
    });
  });

  describe('Regular user blocked (403)', () => {
    it('should return 403 when regular user accesses admin route', async () => {
      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toMatch(/admin access required/i);
    });

    it('should include correct error message in 403 response', async () => {
      const response = await request(app)
        .post('/addproduct')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Test Product',
          category: 'necklaces',
          ils_price: 100
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBe('Admin access required');
    });
  });

  describe('Authentication before authorization (401)', () => {
    it('should return 401 (not 403) when no token provided to admin route', async () => {
      const response = await request(app)
        .post('/api/admin/products/reorder')
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // fetchUser runs first and returns 401 before requireAdmin can run
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toMatch(/authenticate|token/i);
    });

    it('should return 401 for expired token on admin route', async () => {
      const expiredToken = createExpiredToken(adminUser);

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Authentication fails before authorization check
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User type edge cases', () => {
    it('should return 403 for user with undefined userType', async () => {
      const Users = mongoose.model('Users');
      const userWithoutType = await Users.create(
        createUser({ userType: undefined })
      );
      const token = createAuthToken(userWithoutType);

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // fetchUser should reject users without valid userType
      expect(response.status).toBe(403);
    });

    it('should return 403 for user with empty string userType', async () => {
      const Users = mongoose.model('Users');
      const userWithEmptyType = await Users.create(
        createUser({ userType: '' })
      );
      const token = createAuthToken(userWithEmptyType);

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Only 'user' and 'admin' are valid userTypes
      expect(response.status).toBe(403);
    });
  });

  describe('Multiple admin endpoints', () => {
    it('should enforce admin requirement on /addproduct', async () => {
      // Regular user -> 403
      const regularResponse = await request(app)
        .post('/addproduct')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Test Product',
          category: 'necklaces',
          ils_price: 100,
          description: 'Test',
          quantity: 1,
          sku: 'TEST',
          mainImage: { desktop: 'test.jpg', mobile: 'test.jpg' },
          smallImages: []
        });

      expect(regularResponse.status).toBe(403);
      expect(regularResponse.body.errors).toMatch(/admin access required/i);

      // Admin -> not 403 (may fail validation but not authorization)
      const adminResponse = await request(app)
        .post('/addproduct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          category: 'necklaces',
          ils_price: 100,
          description: 'Test',
          quantity: 1,
          sku: 'TEST',
          mainImage: { desktop: 'test.jpg', mobile: 'test.jpg' },
          smallImages: []
        });

      expect(adminResponse.status).not.toBe(403);
    });

    it('should enforce admin requirement on /updateproduct', async () => {
      // Regular user -> 403
      const regularResponse = await request(app)
        .post('/updateproduct')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          id: 1,
          ils_price: 150
        });

      expect(regularResponse.status).toBe(403);
      expect(regularResponse.body.errors).toMatch(/admin access required/i);

      // Admin -> not 403
      const adminResponse = await request(app)
        .post('/updateproduct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 1,
          ils_price: 150
        });

      expect(adminResponse.status).not.toBe(403);
    });

    it('should enforce admin requirement on /api/admin/products/reorder', async () => {
      // Regular user -> 403
      const regularResponse = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      expect(regularResponse.status).toBe(403);

      // Admin -> not 403
      const adminResponse = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      expect(adminResponse.status).not.toBe(403);
    });
  });

  describe('401 vs 403 distinction', () => {
    it('should return 401 for invalid token (authentication failure)', async () => {
      const invalidToken = createInvalidToken(adminUser);

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Authentication fails first (invalid signature) - not 403
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for valid non-admin token (authorization failure)', async () => {
      // This test explicitly demonstrates the difference between 401 and 403
      // 401 = invalid/missing token (authentication)
      // 403 = valid token but insufficient permissions (authorization)

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Authentication passes (token is valid), authorization fails (not admin)
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toMatch(/admin access required/i);
    });
  });

  describe('User type validation', () => {
    it('should handle userType case sensitivity', async () => {
      const Users = mongoose.model('Users');
      const userWithCapitalAdmin = await Users.create(
        createUser({ userType: 'Admin' })
      );
      const token = createAuthToken(userWithCapitalAdmin);

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Code checks for exact 'admin' match (case-sensitive)
      expect(response.status).toBe(403);
    });

    it('should handle userType: "administrator" (not just "admin")', async () => {
      const Users = mongoose.model('Users');
      const userWithAdministrator = await Users.create(
        createUser({ userType: 'administrator' })
      );
      const token = createAuthToken(userWithAdministrator);

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Only 'admin' is valid, not 'administrator'
      expect(response.status).toBe(403);
    });
  });

  describe('Sequential middleware behavior', () => {
    it('should attach req.user before requireAdmin check', async () => {
      // This test verifies the middleware chain is working:
      // fetchUser (attaches req.user) -> requireAdmin (checks req.userDoc)

      const response = await request(app)
        .post('/api/admin/products/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'necklaces',
          productIds: [1, 2, 3]
        });

      // Admin should pass both middlewares
      expect(response.status).not.toBe(401); // fetchUser succeeded
      expect(response.status).not.toBe(403); // requireAdmin succeeded
      // May fail with other error codes (validation, etc) but not 401/403
    });
  });
});
