/**
 * Protected Route Integration Tests (fetchUser middleware)
 *
 * Tests authentication middleware via protected endpoints:
 * - No token returns 401
 * - Valid token returns 200 and attaches user to request
 * - Expired token returns 401
 * - Malformed token returns 401
 * - Token with invalid signature returns 401
 * - Non-existent user returns 401
 * - Header format variations (auth-token, Authorization: Bearer)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createUser } from '../helpers/factories.js';
import {
  createAuthToken,
  createExpiredToken,
  createInvalidToken,
  TEST_JWT_KEY
} from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';
import jwt from 'jsonwebtoken';

// Ensure JWT_KEY is set before importing app
process.env.JWT_KEY = TEST_JWT_KEY;

describe('fetchUser middleware - Protected Routes', () => {
  let app;
  let User;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Import app dynamically after environment validation
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get User model
    User = mongoose.model('Users');
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
  });

  describe('No token scenarios', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/getcart')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toMatch(/authenticate/i);
    });

    it('should return 401 when Authorization header is empty', async () => {
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', '')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toMatch(/authenticate/i);
    });
  });

  describe('Valid token scenarios', () => {
    it('should return 200 with valid auth-token header', async () => {
      // Create user in DB
      const userData = createUser({
        email: 'validuser@example.com',
        cartData: { testItem: 1 }
      });
      await new User(userData).save();

      // Generate valid token
      const token = createAuthToken(userData);

      // Request with auth-token header
      const response = await request(app)
        .post('/getcart')
        .set('auth-token', token)
        .expect(200);

      // Verify response contains cart data
      expect(response.body).toHaveProperty('testItem', 1);
    });

    it('should return 200 with valid Bearer token in Authorization header', async () => {
      // Create user in DB
      const userData = createUser({
        email: 'beareruser@example.com',
        cartData: { testProduct: 2 }
      });
      await new User(userData).save();

      // Generate valid token
      const token = createAuthToken(userData);

      // Request with Authorization: Bearer header
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify response contains cart data
      expect(response.body).toHaveProperty('testProduct', 2);
    });

    it('should attach correct user data to request', async () => {
      // Create user with specific cart data
      const userData = createUser({
        email: 'userdata@example.com',
        cartData: { productA: 3, productB: 5 }
      });
      await new User(userData).save();

      // Generate valid token
      const token = createAuthToken(userData);

      // Request protected endpoint
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify response reflects user's cart data
      expect(response.body).toEqual({ productA: 3, productB: 5 });
    });
  });

  describe('Invalid token scenarios', () => {
    it('should return 401 for expired token', async () => {
      // Create user
      const userData = createUser({
        email: 'expireduser@example.com'
      });
      await new User(userData).save();

      // Generate expired token
      const expiredToken = createExpiredToken(userData);

      // Request with expired token
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toMatch(/authenticate/i);
    });

    it('should return 401 for token with invalid signature', async () => {
      // Create user
      const userData = createUser({
        email: 'invalidsig@example.com'
      });
      await new User(userData).save();

      // Generate token with wrong secret
      const invalidToken = createInvalidToken(userData);

      // Request with invalid token
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toMatch(/authenticate/i);
    });

    it('should return 401 for malformed token string', async () => {
      // Request with malformed token
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', 'Bearer not-a-valid-jwt-at-all')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toMatch(/authenticate/i);
    });

    it('should return 401 for token with missing user.id in payload', async () => {
      // Manually create token with payload missing user.id
      const badPayload = {
        user: {
          email: 'noid@example.com',
          userType: 'user'
          // Missing id field
        }
      };
      const badToken = jwt.sign(badPayload, process.env.JWT_KEY, { expiresIn: '1h' });

      // Request with bad token
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', `Bearer ${badToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid token');
    });
  });

  describe('Token format handling', () => {
    it('should reject token without Bearer prefix in Authorization header', async () => {
      // Create user and token
      const userData = createUser({ email: 'nobearer@example.com' });
      await new User(userData).save();
      const token = createAuthToken(userData);

      // Request with token but no Bearer prefix
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', token)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toMatch(/authenticate/i);
    });

    it('should accept token via auth-token header without Bearer prefix', async () => {
      // Create user
      const userData = createUser({
        email: 'directheader@example.com',
        cartData: { item: 1 }
      });
      await new User(userData).save();

      // Generate token
      const token = createAuthToken(userData);

      // Request with auth-token header (no Bearer prefix needed)
      const response = await request(app)
        .post('/getcart')
        .set('auth-token', token)
        .expect(200);

      expect(response.body).toHaveProperty('item', 1);
    });
  });

  describe('User validation', () => {
    it('should return 401 if token user does not exist in database', async () => {
      // Create token for user that doesn't exist in DB
      const fakeUser = createUser({
        email: 'nonexistent@example.com'
      });
      // Don't save to database
      const token = createAuthToken(fakeUser);

      // Request with token for non-existent user
      const response = await request(app)
        .post('/getcart')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'User not found');
    });
  });
});
