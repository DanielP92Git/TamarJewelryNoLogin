import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { authUser } from '../../../middleware/auth.js';
import { createUser } from '../../helpers/factories.js';
import { Users } from '../../../models/index.js';
import bcrypt from 'bcrypt';

/**
 * Create mock Express request object
 */
function createMockReq(body = {}) {
  return {
    body: body,
    user: undefined
  };
}

/**
 * Create mock Express response object
 */
function createMockRes() {
  const res = {
    statusCode: null,
    jsonData: null,
    status: vi.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function(data) {
      this.jsonData = data;
      return this;
    })
  };
  return res;
}

/**
 * Create mock next function
 */
function createMockNext() {
  return vi.fn();
}

/**
 * Helper to properly wait for authUser callback to complete
 * authUser uses bcrypt.compare with callback, which doesn't await
 */
async function callAuthUser(req, res, next) {
  return new Promise((resolve) => {
    const originalStatus = res.status.bind(res);
    const originalNext = next;

    let resolved = false;
    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        setTimeout(resolve, 50); // Small delay to ensure callback completes
      }
    };

    // Wrap status to detect response
    res.status = vi.fn(function(code) {
      originalStatus(code);
      resolveOnce();
      return this;
    });

    // Wrap next to detect success
    const wrappedNext = vi.fn((...args) => {
      originalNext(...args);
      resolveOnce();
    });

    authUser(req, res, wrappedNext);

    // Fallback timeout
    setTimeout(resolveOnce, 500);
  });
}

describe('authUser middleware', () => {
  let testUser;
  const plainPassword = 'TestPassword123';

  beforeEach(async () => {
    // Create a test user with hashed password
    const userData = createUser({
      password: bcrypt.hashSync(plainPassword, 10)
    });
    testUser = await Users.create(userData);
  });

  it('should call next() and attach user for valid credentials', async () => {
    const req = createMockReq({
      email: testUser.email,
      password: plainPassword
    });
    const res = createMockRes();
    const next = createMockNext();

    await callAuthUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user._id.toString()).toBe(testUser._id.toString());
    expect(req.user.email).toBe(testUser.email);
    expect(req.user.userType).toBe('user');
  });

  it('should return 401 for incorrect password', async () => {
    const req = createMockReq({
      email: testUser.email,
      password: 'WrongPassword123'
    });
    const res = createMockRes();
    const next = createMockNext();

    await callAuthUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('Auth Failed');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 404 for non-existent email', async () => {
    const req = createMockReq({
      email: 'nonexistent@example.com',
      password: plainPassword
    });
    const res = createMockRes();
    const next = createMockNext();

    await authUser(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.jsonData.errors).toContain('No user found');
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw error for user with invalid userType', async () => {
    // Create user with invalid userType
    const invalidUser = await Users.create(createUser({
      userType: 'guest',
      password: bcrypt.hashSync(plainPassword, 10)
    }));

    const req = createMockReq({
      email: invalidUser.email,
      password: plainPassword
    });
    const res = createMockRes();
    const next = createMockNext();

    await authUser(req, res, next);

    // The middleware should catch the error and return 500
    expect(res.statusCode).toBe(500);
    expect(res.jsonData.errors).toContain('Internal Server Error');
    expect(next).not.toHaveBeenCalled();
  });

  it('should authenticate admin user with admin userType', async () => {
    // Create admin user
    const adminUser = await Users.create(createUser({
      userType: 'admin',
      email: 'admin@example.com',
      password: bcrypt.hashSync(plainPassword, 10)
    }));

    const req = createMockReq({
      email: adminUser.email,
      password: plainPassword
    });
    const res = createMockRes();
    const next = createMockNext();

    await callAuthUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.userType).toBe('admin');
  });

  it('should handle bcrypt comparison errors gracefully', async () => {
    // Spy on bcrypt.compare and force an error
    const bcryptSpy = vi.spyOn(bcrypt, 'compare');
    bcryptSpy.mockImplementation((password, hash, callback) => {
      callback(new Error('Bcrypt error'), null);
    });

    const req = createMockReq({
      email: testUser.email,
      password: plainPassword
    });
    const res = createMockRes();
    const next = createMockNext();

    await callAuthUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('Auth Failed');
    expect(next).not.toHaveBeenCalled();

    bcryptSpy.mockRestore();
  });

  it('should handle missing email field in body', async () => {
    const req = createMockReq({
      password: plainPassword
      // email is missing
    });
    const res = createMockRes();
    const next = createMockNext();

    await authUser(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle missing password field in body', async () => {
    const req = createMockReq({
      email: testUser.email
      // password is missing
    });
    const res = createMockRes();
    const next = createMockNext();

    await callAuthUser(req, res, next);

    // bcrypt.compare with undefined password should fail
    expect(res.statusCode).toBe(401);
    expect(res.jsonData.errors).toBe('Auth Failed');
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle empty request body', async () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = createMockNext();

    await authUser(req, res, next);

    expect(res.statusCode).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('should not attach user to req on authentication failure', async () => {
    const req = createMockReq({
      email: testUser.email,
      password: 'WrongPassword'
    });
    const res = createMockRes();
    const next = createMockNext();

    await callAuthUser(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});
