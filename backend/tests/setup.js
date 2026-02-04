/**
 * Global test setup for Vitest
 *
 * This file runs before all tests to:
 * 1. Validate environment (no production credentials)
 * 2. Start mongodb-memory-server (in-memory MongoDB)
 * 3. Connect mongoose to the in-memory database
 * 4. Ensure tests are isolated from production database
 */

// SAFETY FIRST: Validate environment before anything else
import { validateTestEnvironment } from './helpers/envGuard.js';

// This runs at module load time, before any tests
try {
  validateTestEnvironment();
} catch (error) {
  console.error('\n========================================');
  console.error('ENVIRONMENT SAFETY CHECK FAILED');
  console.error('========================================');
  console.error(error.message);
  console.error('\nTests aborted to prevent production contamination.');
  console.error('========================================\n');
  process.exit(1);
}

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { clearDatabase } from './helpers/db.js';
import { resetFactoryCounter } from './helpers/factories.js';
import { cleanAllMocks } from './helpers/mocks/index.js';

let mongoServer;

/**
 * Start mongodb-memory-server and connect mongoose before all tests
 */
beforeAll(async () => {
  // Suppress mongoose deprecation warnings
  mongoose.set('strictQuery', true);

  // Clear production credentials to ensure mocking/memory server is used
  delete process.env.MONGO_URL; // Force use of memory server

  // Set dummy test credentials for PayPal (backend requires them to exist)
  // Actual API calls are intercepted by nock mocks
  process.env.PAYPAL_CLIENT_ID = 'test-paypal-client-id';
  process.env.PAYPAL_CLIENT_SECRET = 'test-paypal-client-secret';
  process.env.PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';

  // Set dummy test credentials for Stripe
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_stripe_key_for_testing';
  delete process.env.STRIPE_WEBHOOK_SECRET;

  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Double-check: Ensure we're using memory server, not real MongoDB
  if (!uri.includes('127.0.0.1')) {
    throw new Error(`SAFETY: Expected in-memory MongoDB (127.0.0.1), got: ${uri}`);
  }

  // Connect mongoose to in-memory server
  await mongoose.connect(uri);

  console.log('✓ Test database connected (mongodb-memory-server)');
});

/**
 * Disconnect mongoose and stop mongodb-memory-server after all tests
 */
afterAll(async () => {
  // Disconnect mongoose
  await mongoose.disconnect();

  // Stop in-memory server
  await mongoServer.stop();

  console.log('✓ Test database disconnected');
});

/**
 * Clean up after each test to ensure isolation
 */
afterEach(async () => {
  // Clear all database collections between tests
  await clearDatabase();

  // Reset factory counter for predictable data sequences
  resetFactoryCounter();

  // Clear any HTTP mocks to prevent leakage
  cleanAllMocks();
});
