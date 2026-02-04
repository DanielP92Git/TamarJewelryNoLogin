/**
 * User test data fixtures.
 * Static mock data for auth and user-related tests.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Basic user fixture (regular customer).
 * Password is hashed version of 'TestPassword123'
 */
export const mockUser = {
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439101'),
  email: 'testuser@example.com',
  password: bcrypt.hashSync('TestPassword123', 10),
  userType: 'user',
  name: 'Test User',
  cartData: {},
  Date: new Date('2024-01-01T00:00:00Z')
};

/**
 * Admin user fixture.
 * Password is hashed version of 'AdminPassword123'
 */
export const mockAdmin = {
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439102'),
  email: 'admin@example.com',
  password: bcrypt.hashSync('AdminPassword123', 10),
  userType: 'admin',
  name: 'Admin User',
  cartData: {},
  Date: new Date('2024-01-01T00:00:00Z')
};

/**
 * Raw credentials for testing login.
 * Use these with the hashed passwords above.
 */
export const mockUserCredentials = {
  email: 'testuser@example.com',
  password: 'TestPassword123'
};

export const mockAdminCredentials = {
  email: 'admin@example.com',
  password: 'AdminPassword123'
};

/**
 * User with items in cart.
 */
export const mockUserWithCart = {
  _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439103'),
  email: 'cartuser@example.com',
  password: bcrypt.hashSync('TestPassword123', 10),
  userType: 'user',
  name: 'Cart User',
  cartData: {
    '507f1f77bcf86cd799439011': {
      quantity: 2,
      price: 75
    }
  },
  Date: new Date('2024-01-01T00:00:00Z')
};

/**
 * Invalid/malformed user for negative testing.
 */
export const mockInvalidUser = {
  email: 'not-an-email',
  password: '123', // too short
  userType: 'invalid-type'
};
