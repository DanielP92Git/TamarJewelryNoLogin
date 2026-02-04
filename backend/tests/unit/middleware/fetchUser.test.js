import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { fetchUser, getTokenFromRequest } from '../../../middleware/auth.js';
import { createUser } from '../../helpers/factories.js';
import { createAuthToken, createExpiredToken, createInvalidToken, TEST_JWT_KEY } from '../../helpers/authHelpers.js';
import { Users } from '../../../models/index.js';

// Ensure JWT_KEY is set
process.env.JWT_KEY = TEST_JWT_KEY;

/**
 * Create mock Express request object
 */
function createMockReq(headers = {}) {
  return {
    header: vi.fn((name) => headers[name.toLowerCase()] || null),
    body: {},
    user: undefined,
    userDoc: undefined
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

describe('getTokenFromRequest', () => {
  it('should extract token from auth-token header', () => {
    const req = createMockReq({ 'auth-token': 'test-token-123' });
    const token = getTokenFromRequest(req);
    expect(token).toBe('test-token-123');
  });

  it('should extract token from Authorization: Bearer header', () => {
    const req = createMockReq({ 'authorization': 'Bearer test-token-456' });
    const token = getTokenFromRequest(req);
    expect(token).toBe('test-token-456');
  });

  it('should return null when no token headers present', () => {
    const req = createMockReq({});
    const token = getTokenFromRequest(req);
    expect(token).toBeNull();
  });

  it('should prefer auth-token over Authorization header', () => {
    const req = createMockReq({
      'auth-token': 'direct-token',
      'authorization': 'Bearer bearer-token'
    });
    const token = getTokenFromRequest(req);
    expect(token).toBe('direct-token');
  });

  it('should return null for malformed Authorization header', () => {
    const req = createMockReq({ 'authorization': 'InvalidFormat' });
    const token = getTokenFromRequest(req);
    expect(token).toBeNull();
  });

  it('should handle Bearer case-insensitively', () => {
    const req = createMockReq({ 'authorization': 'bearer test-token-789' });
    const token = getTokenFromRequest(req);
    expect(token).toBe('test-token-789');
  });

  it('should handle BEARER in uppercase', () => {
    const req = createMockReq({ 'authorization': 'BEARER test-token-upper' });
    const token = getTokenFromRequest(req);
    expect(token).toBe('test-token-upper');
  });

  it('should return null for Authorization with only Bearer', () => {
    const req = createMockReq({ 'authorization': 'Bearer' });
    const token = getTokenFromRequest(req);
    expect(token).toBeNull();
  });
});

describe('fetchUser middleware', () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user in the database
    const userData = createUser();
    testUser = await Users.create(userData);
  });

  it('should call next() for valid token with existing user', async () => {
    const token = createAuthToken(testUser);
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(testUser._id.toString());
    expect(req.user.email).toBe(testUser.email);
    expect(req.user.userType).toBe(testUser.userType);
    expect(req.userDoc).toBeDefined();
    expect(req.userDoc._id.toString()).toBe(testUser._id.toString());
  });

  it('should return 401 when no token provided', async () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toContain('authenticate');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for expired token', async () => {
    const token = createExpiredToken(testUser);
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid signature', async () => {
    const token = createInvalidToken(testUser);
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for token with missing user.id', async () => {
    // Create token with payload missing user.id
    const token = jwt.sign({ user: { email: 'test@example.com' } }, TEST_JWT_KEY, { expiresIn: '1h' });
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('Invalid token');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user not found in database', async () => {
    // Create token for non-existent user ID
    const nonExistentId = new mongoose.Types.ObjectId();
    const token = jwt.sign(
      { user: { id: nonExistentId.toString(), email: 'ghost@example.com', userType: 'user' } },
      TEST_JWT_KEY,
      { expiresIn: '1h' }
    );
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('User not found');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for user with invalid userType', async () => {
    // Create user with invalid userType
    const invalidUser = await Users.create(createUser({ userType: 'guest' }));
    const token = createAuthToken(invalidUser);
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('Forbidden');
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle jwt.verify throwing JsonWebTokenError', async () => {
    // Completely malformed token
    const req = createMockReq({ 'auth-token': 'totally-not-a-jwt' });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should work with Bearer token format', async () => {
    const token = createAuthToken(testUser);
    const req = createMockReq({ 'authorization': `Bearer ${token}` });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(testUser._id.toString());
  });

  it('should return 401 for token with empty user object', async () => {
    const token = jwt.sign({ user: {} }, TEST_JWT_KEY, { expiresIn: '1h' });
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should work for admin users', async () => {
    const adminUser = await Users.create(createUser({ userType: 'admin' }));
    const token = createAuthToken(adminUser);
    const req = createMockReq({ 'auth-token': token });
    const res = createMockRes();
    const next = createMockNext();

    await fetchUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.userType).toBe('admin');
    expect(req.userDoc.userType).toBe('admin');
  });
});
