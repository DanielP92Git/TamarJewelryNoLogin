/**
 * Mock orchestrator for external API mocking in tests.
 * Uses nock to intercept HTTP requests and return configurable responses.
 */
import nock from 'nock';

// Re-export all mocks for convenience
export * from './paypal.js';
export * from './stripe.js';
export * from './exchangeRate.js';
export * from './s3.js';

/**
 * Disable all real HTTP requests in tests.
 * Call this in beforeAll to ensure no requests escape to real APIs.
 */
export function disableNetConnect() {
  nock.disableNetConnect();
  // Allow localhost for supertest integration tests
  nock.enableNetConnect('127.0.0.1');
}

/**
 * Re-enable real HTTP requests (for cleanup).
 */
export function enableNetConnect() {
  nock.enableNetConnect();
}

/**
 * Clear all pending nock interceptors.
 * Call in afterEach to ensure clean state between tests.
 */
export function cleanAllMocks() {
  nock.cleanAll();
}

/**
 * Check if any nock interceptors are still pending (unused).
 * Useful for verifying all expected API calls were made.
 */
export function pendingMocks() {
  return nock.pendingMocks();
}

/**
 * Assert no pending mocks remain.
 * Throws if any expected API calls were not made.
 */
export function assertAllMocksUsed() {
  const pending = pendingMocks();
  if (pending.length > 0) {
    throw new Error(`Unused mocks: ${pending.join(', ')}`);
  }
}
