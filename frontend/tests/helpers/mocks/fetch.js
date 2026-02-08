/**
 * Fetch mock utilities for API testing.
 *
 * Provides simple utilities to mock global.fetch with vi.fn() for API call testing.
 * Based on Vitest mocking patterns from 18-RESEARCH.md.
 */

import { vi } from 'vitest';

let originalFetch;

/**
 * Setup fetch mock - saves original fetch and replaces with vi.fn()
 * Call in beforeEach of tests that need fetch mocking
 */
export function setupFetchMock() {
  originalFetch = global.fetch;
  global.fetch = vi.fn();
}

/**
 * Teardown fetch mock - restores original fetch
 * Call in afterEach to clean up
 */
export function teardownFetchMock() {
  global.fetch = originalFetch;
}

/**
 * Mock a successful fetch response with JSON data
 * @param {Object} data - Data to return in response.json()
 */
export function mockFetchSuccess(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data
  });
}

/**
 * Mock an HTTP error response
 * @param {number} statusCode - HTTP status code (400, 401, 500, etc.)
 * @param {string} message - Error message
 */
export function mockFetchError(statusCode, message = 'Error') {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: statusCode,
    json: async () => ({ error: message })
  });
}

/**
 * Mock a network failure (connection refused, timeout, etc.)
 * Rejects with TypeError to simulate network errors
 */
export function mockFetchNetworkError() {
  global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
}
