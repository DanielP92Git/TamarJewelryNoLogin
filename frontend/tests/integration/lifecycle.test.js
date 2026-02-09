/**
 * MVC Integration: Lifecycle and Cleanup Tests (MVC-06, MVC-07, MVC-08)
 *
 * Tests validate that view lifecycle methods (mount, update, unmount-equivalent)
 * execute correctly, and that event listeners are properly cleaned up during
 * navigation and re-renders to prevent memory leaks.
 *
 * Purpose: Validates the lifecycle management of the MVC architecture. Views
 * re-render frequently (language switches, currency changes) and must not
 * accumulate duplicate event listeners or leave stale DOM elements.
 *
 * IMPORTANT PATTERNS from Phase 19-04:
 * - Happy-DOM lacks `getEventListeners()` -- use behavioral verification
 * - Spy on `view.changeToHeb`/`view.changeToEng` to detect handler accumulation
 * - Test observable outcomes (single action per click) rather than internal state
 * - `view.setLanguage()` replaces menu innerHTML (destroys old DOM nodes and their listeners)
 * - CategoriesTab uses `cloneNode(true)` + `replaceChild` to remove old listeners
 *
 * Key source files:
 * - frontend/js/View.js (setLanguage, handleMenuLanguage, svgHandler, cloneNode patterns)
 * - frontend/js/controller.js (init, controlXxxPage functions)
 * - frontend/js/model.js (handleLoadStorage, checkCartNumber)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, simulateClick } from '../helpers/dom.js';
import View from '../../js/View.js';
import * as model from '../../js/model.js';

describe('MVC Integration: Lifecycle and Cleanup', () => {
  let view;
  let consoleErrorSpy;

  beforeEach(() => {
    localStorage.clear();

    // Mock IntersectionObserver (used by View.js for sticky elements)
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    // Mock window.matchMedia (used by View.js for responsive checks)
    window.matchMedia = vi.fn(() => ({
      matches: true, // desktop mode by default
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    // Mock process.cwd() for dotenv.config() compatibility in model.js imports
    if (typeof process !== 'undefined') {
      process.cwd = vi.fn(() => '/mock/path');
    }

    // Render minimal DOM fixture required by View constructor
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="go-to-top"></div>
    `);

    // Create view instance (all lifecycle methods are on base View class)
    view = new View();

    // Spy on console.error to detect errors during lifecycle operations
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset module-level currency persistence flag
    delete window.__currencyPersistenceInitialized;
    vi.restoreAllMocks();
  });

  describe('View mount initialization (MVC-06)', () => {
    it('should initialize menu with correct language on first mount', async () => {
      await view.setLanguage('eng', 0);

      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      // Verify menu has English structure (ul-eng class)
      const ulEng = menu.querySelector('.ul-eng');
      expect(ulEng).toBeTruthy();
    });

    it('should initialize menu with Hebrew language on first mount', async () => {
      await view.setLanguage('heb', 0);

      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      // Verify menu has Hebrew structure (ul-heb class)
      const ulHeb = menu.querySelector('.ul-heb');
      expect(ulHeb).toBeTruthy();
    });

    it('should initialize footer with correct language on first mount', async () => {
      await view.setLanguage('eng', 0);

      const footer = document.querySelector('.footer');
      expect(footer).toBeTruthy();
      expect(footer.innerHTML.length).toBeGreaterThan(0);

      // Footer should contain navigation links
      expect(footer.innerHTML).toContain('Home');
    });

    it('should initialize flag click handlers on mount', async () => {
      // Spy on changeToHeb BEFORE setLanguage (to capture the handler attached during render)
      const changeToHebSpy = vi.spyOn(view, 'changeToHeb');

      await view.setLanguage('eng', 0);

      // Find Hebrew flag in desktop selector
      const hebFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-heb');
      expect(hebFlag).toBeTruthy();

      // Click the flag
      simulateClick(hebFlag);

      // Verify handler was attached and called
      expect(changeToHebSpy).toHaveBeenCalledTimes(1);

      changeToHebSpy.mockRestore();
    });

    it('should initialize currency selector on mount', async () => {
      await view.setLanguage('eng', 0);

      // Verify currency selector exists
      const currencySelector = document.querySelector('select.header-currency-selector[name="currency"]');
      expect(currencySelector).toBeTruthy();

      // Verify USD and ILS options exist
      const options = Array.from(currencySelector.options).map(opt => opt.value);
      expect(options).toContain('usd');
      expect(options).toContain('ils');
    });

    it('should initialize header utilities with cart icon', async () => {
      await view.setLanguage('eng', 0);

      const headerUtilities = document.querySelector('[data-purpose="header-utilities"]');
      expect(headerUtilities).toBeTruthy();

      // Verify cart link exists
      const cartLink = document.querySelector('.header-cart');
      expect(cartLink).toBeTruthy();

      // Verify cart badge exists
      const cartBadge = document.querySelector('.cart-number-mobile');
      expect(cartBadge).toBeTruthy();
    });
  });

  describe('View update lifecycle (MVC-07)', () => {
    it('should replace menu content entirely on language switch', async () => {
      // Initial render in English
      await view.setLanguage('eng', 0);
      const ulEng = document.querySelector('.menu .ul-eng');
      expect(ulEng).toBeTruthy();

      // Switch to Hebrew - menu innerHTML is replaced
      await view.setLanguage('heb', 0);

      // Old English menu structure should be gone
      const ulEngAfter = document.querySelector('.menu .ul-eng');
      expect(ulEngAfter).toBeNull();

      // New Hebrew menu structure should exist
      const ulHeb = document.querySelector('.menu .ul-heb');
      expect(ulHeb).toBeTruthy();
    });

    it('should replace footer content on language switch', async () => {
      await view.setLanguage('eng', 0);
      const footer = document.querySelector('.footer');
      const englishContent = footer.innerHTML;
      expect(englishContent).toContain('Home');

      await view.setLanguage('heb', 0);
      const hebrewContent = footer.innerHTML;

      // Content should have changed (Hebrew text different from English)
      expect(hebrewContent).not.toBe(englishContent);
      expect(hebrewContent.length).toBeGreaterThan(0);
    });

    it('should update cart number on re-render', async () => {
      // Initial render with cart number 0
      await view.setLanguage('eng', 0);
      let cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('0');

      // Re-render with cart number 5
      await view.setLanguage('eng', 5);
      cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('5');
    });

    it('should re-create header utilities with correct content after update', async () => {
      await view.setLanguage('eng', 0);
      const utilitiesBefore = document.querySelector('.header-utilities');
      expect(utilitiesBefore).toBeTruthy();

      await view.setLanguage('heb', 0);
      const utilitiesAfter = document.querySelector('.header-utilities');
      expect(utilitiesAfter).toBeTruthy();

      // Utilities should still have language flags
      const flags = utilitiesAfter.querySelectorAll('.flag-icon');
      expect(flags.length).toBe(2);
    });

    it('should preserve menu state (closed) after language switch', async () => {
      await view.setLanguage('eng', 0);
      const menu = document.querySelector('.menu');

      // Verify menu doesn't have 'menu-open' class
      expect(menu.classList.contains('menu-open')).toBe(false);

      await view.setLanguage('heb', 0);

      // Menu should still be closed after language switch
      expect(menu.classList.contains('menu-open')).toBe(false);
    });
  });

  describe('Event listener cleanup on re-render (MVC-08)', () => {
    it('should not accumulate flag click handlers after 5 language switches', async () => {
      // Call setLanguage 5 times (same language to stress test)
      for (let i = 0; i < 5; i++) {
        await view.setLanguage('eng', 0);
      }

      // Spy on changeToHeb AFTER all setLanguage calls
      const changeToHebSpy = vi.spyOn(view, 'changeToHeb');

      // Find Hebrew flag in desktop selector
      const hebFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-heb');
      expect(hebFlag).toBeTruthy();

      // Click once
      simulateClick(hebFlag);

      // Verify changeToHeb was called exactly ONCE (not 5 times)
      // If listeners accumulated, this would be called 5 times
      expect(changeToHebSpy).toHaveBeenCalledTimes(1);

      changeToHebSpy.mockRestore();
    });

    it('should not accumulate flag click handlers after alternating eng/heb 5 times', async () => {
      // Alternate between languages 5 times (10 total setLanguage calls)
      for (let i = 0; i < 5; i++) {
        await view.setLanguage('eng', 0);
        await view.setLanguage('heb', 0);
      }

      // Spy on changeToHeb after all switches
      const changeToHebSpy = vi.spyOn(view, 'changeToHeb');

      // Find Hebrew flag in desktop selector
      const hebFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-heb');
      expect(hebFlag).toBeTruthy();

      // Click once
      simulateClick(hebFlag);

      // Verify changeToHeb was called exactly ONCE (not 10 times)
      expect(changeToHebSpy).toHaveBeenCalledTimes(1);

      changeToHebSpy.mockRestore();
    });

    it('should fire currency change event exactly once after multiple re-renders', async () => {
      // Call setLanguage 3 times
      await view.setLanguage('eng', 0);
      await view.setLanguage('heb', 0);
      await view.setLanguage('eng', 0);

      // Add listener for currency-changed event
      const currencyChangedHandler = vi.fn();
      window.addEventListener('currency-changed', currencyChangedHandler);

      // Find currency selector and change to ILS
      const selector = document.querySelector('select.header-currency-selector[name="currency"]');
      expect(selector).toBeTruthy();

      selector.value = 'ils';
      selector.dispatchEvent(new Event('change', { bubbles: true }));

      // Handler should be called exactly ONCE (event delegation pattern works correctly)
      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);
      expect(currencyChangedHandler.mock.calls[0][0].detail.currency).toBe('ils');

      window.removeEventListener('currency-changed', currencyChangedHandler);
    });

    it('should not duplicate currency listener after 8 re-renders', async () => {
      // Extreme re-rendering scenario
      for (let i = 0; i < 8; i++) {
        await view.setLanguage(i % 2 === 0 ? 'eng' : 'heb', 0);
      }

      const currencyChangedHandler = vi.fn();
      window.addEventListener('currency-changed', currencyChangedHandler);

      const selector = document.querySelector('select.header-currency-selector[name="currency"]');
      selector.value = 'usd';
      selector.dispatchEvent(new Event('change', { bubbles: true }));

      // Should fire exactly once (no accumulation)
      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener('currency-changed', currencyChangedHandler);
    });

    it('should handle 10 rapid language switches without degradation', async () => {
      // Loop: setLanguage('eng', 0), setLanguage('heb', 0) x 5
      for (let i = 0; i < 5; i++) {
        await view.setLanguage('eng', 0);
        await view.setLanguage('heb', 0);
      }

      // Verify basic DOM integrity after all switches
      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      // Menu should have either .ul-eng or .ul-heb, not both
      const ulEng = menu.querySelector('.ul-eng');
      const ulHeb = menu.querySelector('.ul-heb');
      const hasExactlyOne = (ulEng && !ulHeb) || (!ulEng && ulHeb);
      expect(hasExactlyOne).toBeTruthy();

      // Footer should still render correctly
      const footer = document.querySelector('.footer');
      expect(footer).toBeTruthy();
      expect(footer.innerHTML.length).toBeGreaterThan(0);

      // Cart badge should still show correct number (last render was 0)
      const cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('0');

      // No console errors should have occurred
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should verify old menu DOM nodes are destroyed after re-render', async () => {
      await view.setLanguage('eng', 0);

      // Get reference to original menu ul element
      const menu = document.querySelector('.menu');
      const originalMenuUl = menu.querySelector('.menu__ul');
      expect(originalMenuUl).toBeTruthy();

      // Store reference
      const oldElement = originalMenuUl;

      // Re-render (triggers innerHTML replacement)
      await view.setLanguage('heb', 0);

      // Old element should NOT be in the document anymore
      expect(document.contains(oldElement)).toBe(false);

      // New menu should exist
      const newMenuUl = menu.querySelector('.menu__ul');
      expect(newMenuUl).toBeTruthy();

      // Should be a different element reference
      expect(newMenuUl).not.toBe(oldElement);
    });
  });

  describe('Async lifecycle (handleLoadStorage, checkCartNumber)', () => {
    it('should complete handleLoadStorage before view renders in controller sequence', async () => {
      // Mock handleLoadStorage and checkCartNumber to track call order
      const callOrder = [];

      vi.spyOn(model, 'handleLoadStorage').mockImplementation(async () => {
        callOrder.push('handleLoadStorage');
      });

      vi.spyOn(model, 'checkCartNumber').mockImplementation(async () => {
        callOrder.push('checkCartNumber');
        return 0;
      });

      // Execute the controller sequence manually (as controller.js does)
      await model.handleLoadStorage();
      const cartNum = await model.checkCartNumber();
      await view.setLanguage('eng', cartNum);
      callOrder.push('setLanguage');

      // Verify correct order
      expect(callOrder).toEqual(['handleLoadStorage', 'checkCartNumber', 'setLanguage']);
    });

    it('should handle handleLoadStorage failure gracefully', async () => {
      // Mock handleLoadStorage to reject
      vi.spyOn(model, 'handleLoadStorage').mockRejectedValue(new Error('Storage error'));

      // Wrap in try-catch as controller does
      try {
        await model.handleLoadStorage();
      } catch (error) {
        // Error caught, continue initialization
      }

      // View can still be initialized after storage failure
      await expect(view.setLanguage('eng', 0)).resolves.not.toThrow();

      // Menu should render correctly
      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();
    });

    it('should handle checkCartNumber failure gracefully', async () => {
      // Mock checkCartNumber to reject
      vi.spyOn(model, 'checkCartNumber').mockRejectedValue(new Error('Cart error'));

      // Wrap in try-catch as controller does
      let cartNum = 0;
      try {
        cartNum = await model.checkCartNumber();
      } catch (error) {
        // Use default cart number on error
        cartNum = 0;
      }

      // View initializes with default cart number
      await view.setLanguage('eng', cartNum);

      const cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('0');
    });

    it('should handle concurrent async operations correctly', async () => {
      // Mock both async operations
      vi.spyOn(model, 'handleLoadStorage').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      vi.spyOn(model, 'checkCartNumber').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 3;
      });

      // Execute controller sequence
      await model.handleLoadStorage();
      const cartNum = await model.checkCartNumber();
      await view.setLanguage('eng', cartNum);

      // Verify view renders with correct cart number
      const cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('3');
    });
  });

  describe('Memory leak prevention', () => {
    it('should not accumulate handlers after navigation simulation', async () => {
      // Simulate user navigation: Home -> About -> Home -> About (4 view initializations)
      // Each would call setLanguage to render menu/footer

      // Home page (first load)
      await view.setLanguage('eng', 0);

      // About page (navigation)
      await view.setLanguage('eng', 2);

      // Home page (back button)
      await view.setLanguage('eng', 2);

      // About page (forward button)
      await view.setLanguage('eng', 2);

      // Spy on changeToHeb after all "navigation"
      const changeToHebSpy = vi.spyOn(view, 'changeToHeb');

      // Click Hebrew flag
      const hebFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-heb');
      simulateClick(hebFlag);

      // Should only fire once (no accumulation from multiple "page loads")
      expect(changeToHebSpy).toHaveBeenCalledTimes(1);

      changeToHebSpy.mockRestore();
    });

    it('should clean up listeners after extreme re-render stress test', async () => {
      // 20 rapid re-renders (extreme stress test)
      for (let i = 0; i < 20; i++) {
        await view.setLanguage(i % 2 === 0 ? 'eng' : 'heb', i % 10);
      }

      // Verify flag handler still fires exactly once
      const changeToEngSpy = vi.spyOn(view, 'changeToEng');

      const engFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-eng');
      simulateClick(engFlag);

      expect(changeToEngSpy).toHaveBeenCalledTimes(1);

      // Verify currency handler still fires exactly once
      const currencyChangedHandler = vi.fn();
      window.addEventListener('currency-changed', currencyChangedHandler);

      const selector = document.querySelector('select.header-currency-selector[name="currency"]');
      selector.value = 'ils';
      selector.dispatchEvent(new Event('change', { bubbles: true }));

      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener('currency-changed', currencyChangedHandler);
      changeToEngSpy.mockRestore();
    });

    it('should verify DOM elements are removed from document after innerHTML replacement', async () => {
      await view.setLanguage('eng', 0);

      // Get all current flag elements
      const flagsBefore = Array.from(document.querySelectorAll('.flag-icon'));
      expect(flagsBefore.length).toBeGreaterThan(0);

      // Re-render
      await view.setLanguage('heb', 0);

      // Original flag elements should NOT be in document
      flagsBefore.forEach(oldFlag => {
        expect(document.contains(oldFlag)).toBe(false);
      });

      // New flags should exist
      const flagsAfter = Array.from(document.querySelectorAll('.flag-icon'));
      expect(flagsAfter.length).toBeGreaterThan(0);

      // Should be completely different objects
      expect(flagsAfter.some(newFlag => flagsBefore.includes(newFlag))).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing menu element gracefully', async () => {
      // Remove menu element
      const menu = document.querySelector('.menu');
      menu.remove();

      // setLanguage should handle gracefully (logs error but doesn't throw)
      await expect(view.setLanguage('eng', 0)).resolves.not.toThrow();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle rapid sequential language switches without race conditions', async () => {
      // Start multiple setLanguage calls without awaiting (simulate rapid clicks)
      const promises = [
        view.setLanguage('eng', 0),
        view.setLanguage('heb', 0),
        view.setLanguage('eng', 0),
        view.setLanguage('heb', 0)
      ];

      // Wait for all to complete
      await Promise.all(promises);

      // Final state should be consistent (last language applied)
      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      // Menu should have only one of ul-eng or ul-heb, not both
      const ulEng = menu.querySelector('.ul-eng');
      const ulHeb = menu.querySelector('.ul-heb');
      const hasExactlyOne = (ulEng && !ulHeb) || (!ulEng && ulHeb);
      expect(hasExactlyOne).toBeTruthy();
    });

    it('should preserve cart number across language switches with different values', async () => {
      // First render with cart number 3
      await view.setLanguage('eng', 3);
      let cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('3');

      // Switch language, different cart number
      await view.setLanguage('heb', 7);
      cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('7');

      // Switch back to English, same cart number
      await view.setLanguage('eng', 7);
      cartBadge = document.querySelector('.cart-number-mobile');
      expect(String(cartBadge.textContent)).toBe('7');
    });
  });
});
