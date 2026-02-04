/**
 * Signup Endpoint Integration Tests
 * Tests POST /signup endpoint for user registration.
 *
 * Covers:
 * - User creation with password hashing
 * - Validation of required fields
 * - Duplicate email prevention
 * - Default user type assignment
 * - Cart data initialization
 * - bcrypt configuration verification
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Import test helpers
import { createUser } from '../helpers/factories.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

describe('POST /signup', () => {
  let app;
  let Users;
  let counter = 0;

  beforeAll(async () => {
    // Verify we're in safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Import app after environment is validated
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get Users model for direct database queries
    Users = mongoose.model('Users');
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    // Clear mocks between tests
    cleanAllMocks();
    // Increment counter for unique emails
    counter++;
  });

  describe('Success Cases', () => {
    it('should create user and return 201 for valid signup data', async () => {
      const email = `newuser${counter}@example.com`;
      const password = 'SecurePassword123';
      const username = `Test User ${counter}`;

      // Send signup request
      const response = await request(app)
        .post('/signup')
        .send({ email, password, username })
        .expect(201);

      // Verify response
      expect(response.body).toHaveProperty('message', 'User Created!');

      // Verify user exists in database
      const savedUser = await Users.findOne({ email });
      expect(savedUser).toBeDefined();
      expect(savedUser.email).toBe(email);
      expect(savedUser.name).toBe(username);
    });

    it('should hash password before storing in database', async () => {
      const email = `hashtest${counter}@example.com`;
      const password = 'PlaintextPassword123';
      const username = `Hash Test User ${counter}`;

      // Signup user
      await request(app)
        .post('/signup')
        .send({ email, password, username })
        .expect(201);

      // Query database for created user
      const savedUser = await Users.findOne({ email });
      expect(savedUser).toBeDefined();

      // Verify password is NOT stored in plaintext
      expect(savedUser.password).not.toBe(password);

      // Verify password is hashed with bcrypt (starts with $2a$ or $2b$)
      expect(savedUser.password).toMatch(/^\$2[ab]\$/);

      // Verify bcrypt.compare validates the password
      const isValid = await bcrypt.compare(password, savedUser.password);
      expect(isValid).toBe(true);
    });

    it('should create user with userType "user" by default', async () => {
      const email = `defaulttype${counter}@example.com`;
      const password = 'Password123';
      const username = `Default Type User ${counter}`;

      // Signup user without specifying userType
      await request(app)
        .post('/signup')
        .send({ email, password, username })
        .expect(201);

      // Query database
      const savedUser = await Users.findOne({ email });
      expect(savedUser).toBeDefined();

      // Verify default userType is 'user'
      expect(savedUser.userType).toBe('user');
    });

    it('should initialize cartData for new user', async () => {
      const email = `cartinit${counter}@example.com`;
      const password = 'Password123';
      const username = `Cart Init User ${counter}`;

      // Signup user
      await request(app)
        .post('/signup')
        .send({ email, password, username })
        .expect(201);

      // Query database
      const savedUser = await Users.findOne({ email });
      expect(savedUser).toBeDefined();

      // Verify cartData exists and is initialized
      expect(savedUser.cartData).toBeDefined();
      expect(typeof savedUser.cartData).toBe('object');
      // Backend initializes cart with 300 entries (0-299)
      expect(Object.keys(savedUser.cartData).length).toBe(300);
    });
  });

  describe('Validation Failures', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          password: 'Password123',
          username: 'Test User'
        })
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid signup payload');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          email: `missingpw${counter}@example.com`,
          username: 'Test User'
        })
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid signup payload');
    });

    it('should return 400 for missing username', async () => {
      const response = await request(app)
        .post('/signup')
        .send({
          email: `missinguser${counter}@example.com`,
          password: 'Password123'
        })
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors', 'Invalid signup payload');
    });
  });

  describe('Duplicate Prevention', () => {
    it('should return 400 for duplicate email', async () => {
      const email = `duplicate${counter}@example.com`;
      const password = 'Password123';
      const username = 'Duplicate Test User';

      // Create user using factory and save to database
      const userData = createUser({ email });
      await new Users(userData).save();

      // Attempt to signup with same email
      const response = await request(app)
        .post('/signup')
        .send({ email, password, username })
        .expect(400);

      // Verify error message contains 'Existing user'
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toContain('Existing user');
    });
  });

  describe('bcrypt Configuration Verification', () => {
    it('should generate unique salt for each password hash', async () => {
      const password = 'IdenticalPassword123';
      const email1 = `salt1-${counter}@example.com`;
      const email2 = `salt2-${counter}@example.com`;

      // Sign up two users with identical passwords
      await request(app)
        .post('/signup')
        .send({ email: email1, password, username: 'User 1' })
        .expect(201);

      await request(app)
        .post('/signup')
        .send({ email: email2, password, username: 'User 2' })
        .expect(201);

      // Query both users from database
      const user1 = await Users.findOne({ email: email1 });
      const user2 = await Users.findOne({ email: email2 });

      expect(user1).toBeDefined();
      expect(user2).toBeDefined();

      // Verify hashes are different (different salts)
      expect(user1.password).not.toBe(user2.password);

      // Verify both hashes validate against the original password
      const user1Valid = await bcrypt.compare(password, user1.password);
      const user2Valid = await bcrypt.compare(password, user2.password);
      expect(user1Valid).toBe(true);
      expect(user2Valid).toBe(true);
    });

    it('should use bcrypt cost factor of 10', async () => {
      const email = `costfactor${counter}@example.com`;
      const password = 'Password123';
      const username = 'Cost Factor Test User';

      // Signup user
      await request(app)
        .post('/signup')
        .send({ email, password, username })
        .expect(201);

      // Query from database
      const savedUser = await Users.findOne({ email });
      expect(savedUser).toBeDefined();

      // Extract cost factor from bcrypt hash
      // bcrypt hash format: $2a$10$... where 10 is the cost factor
      const hashParts = savedUser.password.split('$');
      const costFactor = parseInt(hashParts[2], 10);

      // Verify cost factor is 10 (production setting)
      expect(costFactor).toBe(10);
    });
  });
});
