/**
 * Integration test helper utilities for MVC integration tests.
 *
 * Provides:
 * - createBaseFixture(): Minimal DOM structure required by ALL views
 * - setupControllerMocks(): Common mocks for controller tests (external boundaries only)
 * - cleanupIntegrationState(): Reset all global state between tests
 *
 * IMPORTANT: Only mocks external boundaries (fetch, IntersectionObserver, process.env).
 * Does NOT mock internal MVC wiring (view methods, event propagation).
 */

import { vi } from 'vitest';
import * as model from '../../js/model.js';

/**
 * Creates the minimal DOM fixture that ALL views require.
 * This includes header, menu, utilities, footer, go-to-top, and cart number elements.
 *
 * @param {string} bodyId - Optional value for document.body.id (e.g., 'home', 'cart')
 * @returns {string} HTML string for the base fixture
 *
 * @example
 * render(createBaseFixture('home'));
 */
export function createBaseFixture(bodyId = '') {
  if (bodyId) {
    document.body.id = bodyId;
  }

  return `
    <header></header>
    <div class="menu"></div>
    <div data-purpose="header-utilities"></div>
    <div class="footer"></div>
    <div class="go-to-top"></div>
    <span class="cart-number"></span>
    <span class="cart-number-mobile">0</span>
  `;
}

/**
 * Sets up common mocks needed for controller integration tests.
 * Only mocks external API boundaries, NOT internal MVC logic.
 *
 * Mocks:
 * - model.handleLoadStorage (external localStorage/API call)
 * - model.checkCartNumber (external localStorage/API call)
 * - process.env.API_URL and process.env.USD_ILS_RATE
 * - IntersectionObserver (used by stickyMenuFn)
 *
 * @returns {Object} Object with references to created mocks for custom assertions
 *
 * @example
 * const mocks = setupControllerMocks();
 * // Later: expect(mocks.handleLoadStorage).toHaveBeenCalled();
 */
export function setupControllerMocks() {
  // Mock external API boundaries
  const handleLoadStorageSpy = vi.spyOn(model, 'handleLoadStorage').mockResolvedValue();
  const checkCartNumberSpy = vi.spyOn(model, 'checkCartNumber').mockResolvedValue(0);

  // Mock environment variables
  process.env.API_URL = 'http://localhost:3001';
  process.env.USD_ILS_RATE = '3.7';

  // Mock IntersectionObserver (used by stickyMenuFn)
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock window.matchMedia (used by responsive checks)
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: query === '(min-width: 800px)' ? true : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  return {
    handleLoadStorage: handleLoadStorageSpy,
    checkCartNumber: checkCartNumberSpy,
  };
}

/**
 * Cleans up all integration test state.
 * Should be called in afterEach to ensure test isolation.
 *
 * Resets:
 * - model.cart array
 * - localStorage and sessionStorage
 * - Currency persistence flag
 * - All Vitest mocks
 *
 * @example
 * afterEach(() => {
 *   cleanupIntegrationState();
 * });
 */
export function cleanupIntegrationState() {
  // Reset model.cart
  model.cart.length = 0;

  // Clear storage
  localStorage.clear();
  sessionStorage.clear();

  // Reset currency persistence flag
  delete window.__currencyPersistenceInitialized;

  // Restore all mocks
  vi.restoreAllMocks();
}
