/**
 * Authentication test helpers for JWT token generation.
 * Use these to create valid, expired, or invalid tokens for testing auth flows.
 */

// Ensure JWT_KEY is set for tests (before any imports that might use it)
if (!process.env.JWT_KEY) {
  process.env.JWT_KEY = 'test-jwt-secret-key-32-chars-long!';
}

import jwt from 'jsonwebtoken';

/**
 * Test JWT key constant for tests that need to set it explicitly.
 */
export const TEST_JWT_KEY = 'test-jwt-secret-key-32-chars-long!';

/**
 * Create a valid JWT token from user document.
 *
 * @param {Object} userDoc - User document from database
 * @param {Object} options - Optional jwt.sign options to override defaults
 * @returns {string} JWT token
 *
 * @example
 * const user = await createUser();
 * const token = createAuthToken(user);
 * // Use token in Authorization header: Bearer ${token}
 */
export function createAuthToken(userDoc, options = {}) {
  const payload = {
    user: {
      id: userDoc._id.toString(),
      email: userDoc.email,
      userType: userDoc.userType
    }
  };

  const defaultOptions = {
    expiresIn: '1h'
  };

  return jwt.sign(payload, process.env.JWT_KEY, {
    ...defaultOptions,
    ...options
  });
}

/**
 * Create an already-expired JWT token.
 * Use for testing token expiration handling.
 *
 * @param {Object} userDoc - User document from database
 * @returns {string} Expired JWT token
 *
 * @example
 * const user = await createUser();
 * const expiredToken = createExpiredToken(user);
 * // Making request with this token should return 401
 */
export function createExpiredToken(userDoc) {
  const payload = {
    user: {
      id: userDoc._id.toString(),
      email: userDoc.email,
      userType: userDoc.userType
    }
  };

  return jwt.sign(payload, process.env.JWT_KEY, {
    expiresIn: '-1s' // Expired 1 second ago
  });
}

/**
 * Create a token with invalid signature (wrong secret key).
 * Use for testing token validation/verification.
 *
 * @param {Object} userDoc - User document from database
 * @returns {string} JWT token signed with wrong key
 *
 * @example
 * const user = await createUser();
 * const invalidToken = createInvalidToken(user);
 * // jwt.verify will fail with this token
 */
export function createInvalidToken(userDoc) {
  const payload = {
    user: {
      id: userDoc._id.toString(),
      email: userDoc.email,
      userType: userDoc.userType
    }
  };

  return jwt.sign(payload, 'wrong-secret-key', {
    expiresIn: '1h'
  });
}
