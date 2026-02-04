/**
 * Login Endpoint Integration Tests (POST /login)
 *
 * Tests authentication flow including:
 * - Valid credentials return 200 with JWT token
 * - Invalid password returns 401
 * - Non-existent email returns 404
 * - Missing fields return 400
 * - Token structure and validity
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Import factories and fixtures
import { createUser, createAdmin } from '../helpers/factories.js';
import { mockUserCredentials, mockAdminCredentials } from '../helpers/fixtures/users.js';

// Import auth helpers
import { createAuthToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';

// Import environment guard and mocks
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

describe('POST /login - Authentication', () => {
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

  describe('Success Cases', () => {
    it('should return 200 and JWT token for valid user credentials', async () => {
      // Create user with known password
      const userData = createUser({
        email: 'logintest@example.com'
        // Password is already hashed as 'TestPassword123' by factory
      });
      await new User(userData).save();

      // Login with plaintext password
      const response = await request(app)
        .post('/login')
        .send({
          email: 'logintest@example.com',
          password: 'TestPassword123'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('adminCheck', 'user');
      expect(response.body).toHaveProperty('message', 'Login successful');

      // Verify token is defined and non-empty
      const token = response.body.token;
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Verify token decodes to correct user
      const decoded = jwt.decode(token);
      expect(decoded).toHaveProperty('user');
      expect(decoded.user.email).toBe('logintest@example.com');
      expect(decoded.user.userType).toBe('user');
      expect(decoded.user.id).toBe(userData._id.toString());
    });

    it('should return adminCheck field matching user type for regular user', async () => {
      // Create regular user
      const userData = createUser({
        email: 'regularuser@example.com',
        userType: 'user'
      });
      await new User(userData).save();

      const response = await request(app)
        .post('/login')
        .send({
          email: 'regularuser@example.com',
          password: 'TestPassword123'
        })
        .expect(200);

      expect(response.body.adminCheck).toBe('user');
      expect(response.body.success).toBe(true);
    });

    it('should return adminCheck field matching user type for admin user', async () => {
      // Create admin user
      const adminData = createAdmin({
        email: 'adminuser@example.com'
      });
      await new User(adminData).save();

      const response = await request(app)
        .post('/login')
        .send({
          email: 'adminuser@example.com',
          password: 'TestPassword123'
        })
        .expect(200);

      expect(response.body.adminCheck).toBe('admin');
      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication Failures', () => {
    it('should return 401 for incorrect password', async () => {
      // Create user with known password
      const userData = createUser({
        email: 'wrongpasstest@example.com'
      });
      await new User(userData).save();

      // Login with wrong password
      const response = await request(app)
        .post('/login')
        .send({
          email: 'wrongpasstest@example.com',
          password: 'WrongPassword999'
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Auth Failed');
    });

    it('should return 404 for non-existent email', async () => {
      // Try to login with email that doesn't exist
      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123'
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toMatch(/No user found/i);
    });
  });

  describe('Validation Failures', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          password: 'TestPassword123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid login payload');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid login payload');
    });

    it('should return 400 for empty request body', async () => {
      const response = await request(app)
        .post('/login')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid login payload');
    });

    it('should return 400 for non-string email', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 12345,
          password: 'TestPassword123'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid login payload');
    });

    it('should return 400 for non-string password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 12345
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid login payload');
    });
  });

  describe('Token Verification', () => {
    it('should return token that validates with JWT_KEY', async () => {
      // Create user
      const userData = createUser({
        email: 'tokentest@example.com'
      });
      await new User(userData).save();

      // Get token from login
      const response = await request(app)
        .post('/login')
        .send({
          email: 'tokentest@example.com',
          password: 'TestPassword123'
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeDefined();

      // Verify token with JWT_KEY (should not throw)
      let decoded;
      expect(() => {
        decoded = jwt.verify(token, process.env.JWT_KEY);
      }).not.toThrow();

      // Verify payload structure
      expect(decoded).toHaveProperty('user');
      expect(decoded.user).toHaveProperty('id');
      expect(decoded.user).toHaveProperty('email', 'tokentest@example.com');
      expect(decoded.user).toHaveProperty('userType', 'user');
    });

    it('should return token with correct expiration', async () => {
      // Create user
      const userData = createUser({
        email: 'expirytest@example.com'
      });
      await new User(userData).save();

      // Get token
      const response = await request(app)
        .post('/login')
        .send({
          email: 'expirytest@example.com',
          password: 'TestPassword123'
        })
        .expect(200);

      const token = response.body.token;
      const decoded = jwt.decode(token);

      // Token should have exp claim
      expect(decoded).toHaveProperty('exp');

      // Token should be valid for approximately 1 hour
      const now = Math.floor(Date.now() / 1000);
      const oneHour = 3600;
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(now + oneHour + 10); // +10 sec tolerance
    });
  });
});
