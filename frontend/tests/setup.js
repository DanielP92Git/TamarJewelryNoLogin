/**
 * Global test setup for Vitest with jsdom environment.
 * This file runs before each test to ensure a clean state.
 */

import { beforeEach, afterEach } from 'vitest';

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
 * Mock window.scrollTo (common SPA need, does nothing in tests)
 */
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}

/**
 * Mock window.location.assign to prevent actual navigation during tests
 */
if (typeof window !== 'undefined' && window.location) {
  const originalLocation = window.location;
  delete window.location;
  window.location = {
    ...originalLocation,
    assign: () => {},
    reload: () => {},
    replace: () => {}
  };
}
