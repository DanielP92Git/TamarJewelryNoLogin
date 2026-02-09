/**
 * Global test setup for Vitest with Happy-DOM environment.
 * This file runs before each test to ensure a clean state.
 *
 * Happy-DOM provides built-in localStorage implementation (no mock needed).
 * Using vi.fn() for window mocks enables test assertions on navigation calls.
 */

import { beforeEach, afterEach, vi } from 'vitest';

/**
 * Set environment variables before any modules are imported
 * This ensures class field initializers (e.g., _host = process.env.API_URL) work correctly
 */
process.env.API_URL = process.env.API_URL || 'http://localhost:4000';
process.env.USD_ILS_RATE = process.env.USD_ILS_RATE || '3.7';

/**
 * Before each test: Clear the DOM to prevent test pollution
 */
beforeEach(() => {
  // Clear document body
  document.body.innerHTML = '';

  // Reset document title
  document.title = '';
});

/**
 * After each test: Clean up localStorage and any global state
 */
afterEach(() => {
  // Clear all localStorage keys
  localStorage.clear();

  // Clear sessionStorage as well
  sessionStorage.clear();
});

/**
 * Mock window.scrollTo with vi.fn() for test introspection
 * Common SPA need - prevents errors and allows assertions like:
 * expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
 */
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

/**
 * Mock window.location with vi.fn() wrappers for navigation tracking
 * Prevents actual navigation during tests and enables assertions like:
 * expect(window.location.assign).toHaveBeenCalledWith('/cart')
 */
if (typeof window !== 'undefined' && window.location) {
  delete window.location;
  window.location = {
    href: '',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn()
  };
}
