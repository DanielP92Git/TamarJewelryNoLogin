/**
 * User Model Tests
 *
 * Tests the User Mongoose model directly (not through HTTP endpoints).
 * Covers DATA-10 through DATA-13:
 * - DATA-10: User creation with defaults (userType, Date)
 * - DATA-11: Email format validation (regex match)
 * - DATA-12: Email uniqueness enforcement
 * - DATA-13: UserType behavior (no enum constraint)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Import User model (CommonJS module)
let User;
beforeAll(async () => {
  User = (await import('../../models/User.js')).default;
});

describe('User Model Tests', () => {
  // Counter for unique test emails
  let emailCounter = 0;
  function uniqueEmail() {
    emailCounter++;
    return `testuser${emailCounter}@example.com`;
  }

  describe('User Creation - Valid Data (DATA-10)', () => {
    it('should create user with valid email and password', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'SecurePass123'
      });

      expect(user._id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.userType).toBe('user'); // default
      expect(user.Date).toBeInstanceOf(Date);
    });

    it('should store password as-is (no pre-save hash hook in schema)', async () => {
      // IMPORTANT: The User schema does NOT have a pre-save hook for password hashing.
      // Hashing is done in the signup endpoint logic, not in the model.
      // This test documents actual model behavior.
      const email = uniqueEmail();
      const plainPassword = 'plaintext';
      const user = await User.create({
        email,
        password: plainPassword
      });

      // Password is stored exactly as provided (no automatic hashing)
      expect(user.password).toBe(plainPassword);
      expect(user.password).not.toMatch(/^\$2[ab]\$/); // Not a bcrypt hash
    });

    it('should set default userType to user', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123'
      });

      expect(user.userType).toBe('user');
    });

    it('should set default Date to current date', async () => {
      const beforeCreate = new Date();
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123'
      });
      const afterCreate = new Date();

      expect(user.Date).toBeInstanceOf(Date);
      expect(user.Date.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      expect(user.Date.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    });

    it('should create user with name and cartData', async () => {
      const email = uniqueEmail();
      const productId = new mongoose.Types.ObjectId().toString();
      const user = await User.create({
        email,
        password: 'TestPass123',
        name: 'John Doe',
        cartData: {
          [productId]: { quantity: 2, price: 50 }
        }
      });

      expect(user.name).toBe('John Doe');
      expect(user.cartData).toBeDefined();
      expect(user.cartData[productId]).toEqual({ quantity: 2, price: 50 });
    });
  });

  describe('Email Format Validation (DATA-11)', () => {
    it('should accept valid email formats', async () => {
      // Test various valid lowercase email formats
      const validEmails = [
        'user@example.com',
        'user+tag@example.com',
        'first.last@domain.org'
      ];

      for (const email of validEmails) {
        const user = await User.create({
          email,
          password: 'TestPass123'
        });
        expect(user.email).toBe(email);
      }
    });

    it('should reject email without @ symbol', async () => {
      await expect(
        User.create({
          email: 'notanemail',
          password: 'TestPass123'
        })
      ).rejects.toThrow(/validation failed/i);
    });

    it('should reject email without domain', async () => {
      await expect(
        User.create({
          email: 'user@',
          password: 'TestPass123'
        })
      ).rejects.toThrow(/validation failed/i);
    });

    it('should reject email without local part', async () => {
      await expect(
        User.create({
          email: '@example.com',
          password: 'TestPass123'
        })
      ).rejects.toThrow(/validation failed/i);
    });

    it('should reject empty string email', async () => {
      await expect(
        User.create({
          email: '',
          password: 'TestPass123'
        })
      ).rejects.toThrow(/validation failed/i);
    });

    it('should reject uppercase emails (regex only matches lowercase)', async () => {
      // The regex pattern is lowercase-only: [a-z0-9...]
      // Uppercase letters should fail validation
      await expect(
        User.create({
          email: 'User@Example.com',
          password: 'TestPass123'
        })
      ).rejects.toThrow(/validation failed/i);
    });
  });

  describe('Email Uniqueness (DATA-12)', () => {
    it('should reject duplicate email', async () => {
      const email = uniqueEmail();

      // Create first user
      await User.create({
        email,
        password: 'FirstPassword'
      });

      // Try to create second user with same email
      await expect(
        User.create({
          email,
          password: 'SecondPassword'
        })
      ).rejects.toThrow(/duplicate key/i);
    });

    it('should treat emails as case-sensitive (no lowercase transform)', async () => {
      // The schema has NO lowercase: true transform
      // The regex only matches lowercase, so uppercase will fail validation first
      const lowerEmail = uniqueEmail();

      await User.create({
        email: lowerEmail,
        password: 'TestPass123'
      });

      // Try creating with uppercase version - should fail at validation (not uniqueness)
      const upperEmail = lowerEmail.toUpperCase();
      await expect(
        User.create({
          email: upperEmail,
          password: 'TestPass123'
        })
      ).rejects.toThrow(); // Fails at regex validation
    });

    it('should prevent race condition duplicates', async () => {
      const email = uniqueEmail();

      // Try creating 3 users with same email concurrently
      const results = await Promise.allSettled([
        User.create({ email, password: 'Pass1' }),
        User.create({ email, password: 'Pass2' }),
        User.create({ email, password: 'Pass3' })
      ]);

      // Only one should succeed
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(succeeded.length).toBe(1);
      expect(failed.length).toBe(2);

      // Verify only 1 user exists in DB with this email
      const count = await User.countDocuments({ email });
      expect(count).toBe(1);
    });
  });

  describe('UserType Behavior (DATA-13)', () => {
    it('should accept userType admin', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123',
        userType: 'admin'
      });

      expect(user.userType).toBe('admin');
    });

    it('should accept userType user', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123',
        userType: 'user'
      });

      expect(user.userType).toBe('user');
    });

    it('should accept any string as userType (no enum validator)', async () => {
      // The User schema has NO enum constraint on userType - it's a plain String
      // This test documents actual schema behavior
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123',
        userType: 'moderator' // Not 'user' or 'admin'
      });

      expect(user.userType).toBe('moderator');
    });

    it('should default to user when userType not specified', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123'
        // userType not specified
      });

      expect(user.userType).toBe('user');
    });
  });

  describe('User CRUD Operations', () => {
    it('should find user by email', async () => {
      const email = uniqueEmail();
      await User.create({
        email,
        password: 'TestPass123'
      });

      const found = await User.findOne({ email });
      expect(found).toBeDefined();
      expect(found.email).toBe(email);
    });

    it('should update user email', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123'
      });

      const newEmail = uniqueEmail();
      await User.updateOne({ _id: user._id }, { email: newEmail });

      const updated = await User.findById(user._id);
      expect(updated.email).toBe(newEmail);
    });

    it('should delete user by ID', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123'
      });

      await User.deleteOne({ _id: user._id });

      const found = await User.findById(user._id);
      expect(found).toBeNull();
    });

    it('should update cartData', async () => {
      const email = uniqueEmail();
      const user = await User.create({
        email,
        password: 'TestPass123',
        cartData: {}
      });

      const productId = new mongoose.Types.ObjectId().toString();
      const newCartData = {
        [productId]: { quantity: 3, price: 75 }
      };

      await User.updateOne({ _id: user._id }, { cartData: newCartData });

      const updated = await User.findById(user._id);
      expect(updated.cartData[productId]).toEqual({ quantity: 3, price: 75 });
    });
  });
});
