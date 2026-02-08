/**
 * Event listener cleanup and memory leak prevention tests (VIEW-11)
 *
 * Tests validate that View.js does not accumulate event listeners on repeated
 * language/currency switches. View.js uses three cleanup strategies:
 * 1. innerHTML replacement - destroys all menu children and their listeners
 * 2. cloneNode(true) + replaceChild - creates new element without old listeners
 * 3. Document-level event delegation - currency listener initialized only once
 *
 * Since Happy-DOM doesn't provide listener introspection APIs (getEventListeners
 * is Chrome DevTools-only), tests verify observable behavior (no duplicate actions)
 * rather than listener counts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, simulateClick } from '../helpers/dom.js';
import View from '../../js/View.js';

describe('Event Listener Cleanup Tests', () => {
  let view;

  beforeEach(() => {
    localStorage.clear();

    // Render minimal DOM fixture required by View constructor
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);

    view = new View();
  });

  afterEach(() => {
    // Reset module-level currency persistence flag
    delete window.__currencyPersistenceInitialized;
    vi.restoreAllMocks();
  });

  describe('Menu innerHTML Replacement Cleanup', () => {
    it('should destroy old menu elements on language switch', async () => {
      // Initial render in English
      await view.setLanguage('eng', 0);

      // Query a menu link element (menu__ul is created by handleMenuLanguage)
      const menu = document.querySelector('.menu');
      const originalMenuUl = menu.querySelector('.menu__ul');
      expect(originalMenuUl).toBeTruthy();

      // Store reference to old element
      const oldElement = originalMenuUl;

      // Switch to Hebrew - triggers innerHTML replacement (line 736)
      await view.setLanguage('heb', 0);

      // Old element should NOT be in the document anymore
      expect(document.contains(oldElement)).toBe(false);
    });

    it('should create new menu elements with correct language', async () => {
      await view.setLanguage('eng', 0);
      const menuEng = document.querySelector('.menu');

      await view.setLanguage('heb', 0);
      const menuHeb = document.querySelector('.menu');

      // Menu still exists but is a different structure
      expect(menuHeb).toBeTruthy();

      // Hebrew flag should now be selected
      const hebFlag = document.querySelector('.flag-icon.flag-heb.selected');
      expect(hebFlag).toBeTruthy();
    });
  });

  describe('Flag Click Handlers - No Accumulation', () => {
    it('should not accumulate flag click handlers after multiple language switches', async () => {
      // Switch languages multiple times
      await view.setLanguage('eng', 0);
      await view.setLanguage('heb', 0);
      await view.setLanguage('eng', 0);
      await view.setLanguage('heb', 0);
      await view.setLanguage('eng', 0);

      // Find Hebrew flag in desktop selector
      const hebFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-heb');
      expect(hebFlag).toBeTruthy();

      // Spy on changeToHeb method to verify it's only called once per click
      const changeToHebSpy = vi.spyOn(view, 'changeToHeb');

      simulateClick(hebFlag);

      // Verify changeToHeb was called exactly ONCE
      // (If listeners accumulated, it would be called multiple times)
      expect(changeToHebSpy).toHaveBeenCalledTimes(1);

      changeToHebSpy.mockRestore();
    });

    it('should handle flag clicks correctly after 10 language switches', async () => {
      // Extreme case - 10 switches
      for (let i = 0; i < 5; i++) {
        await view.setLanguage('eng', 0);
        await view.setLanguage('heb', 0);
      }

      // Click English flag
      const engFlag = document.querySelector('.desktop-lang-selector .flag-icon.flag-eng');
      expect(engFlag).toBeTruthy();

      // Spy on changeToEng method
      const changeToEngSpy = vi.spyOn(view, 'changeToEng');

      simulateClick(engFlag);

      // Should fire exactly once (no accumulation)
      expect(changeToEngSpy).toHaveBeenCalledTimes(1);

      changeToEngSpy.mockRestore();
    });
  });

  describe('Currency Event Delegation - Single Listener', () => {
    it('should fire currency-changed event exactly once per change', async () => {
      // Switch languages multiple times
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

      // Handler should be called exactly ONCE
      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);
      expect(currencyChangedHandler.mock.calls[0][0].detail.currency).toBe('ils');

      window.removeEventListener('currency-changed', currencyChangedHandler);
    });

    it('should not duplicate currency listener after multiple re-renders', async () => {
      // Extreme re-rendering scenario
      for (let i = 0; i < 8; i++) {
        await view.setLanguage(i % 2 === 0 ? 'eng' : 'heb', 0);
      }

      const currencyChangedHandler = vi.fn();
      window.addEventListener('currency-changed', currencyChangedHandler);

      const selector = document.querySelector('select.header-currency-selector[name="currency"]');
      selector.value = 'usd';
      selector.dispatchEvent(new Event('change', { bubbles: true }));

      // Should fire exactly once
      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener('currency-changed', currencyChangedHandler);
    });
  });

  describe('Currency Selector - No Duplicate Actions', () => {
    it('should update localStorage exactly once per currency change', async () => {
      localStorage.setItem('currency', 'usd');

      // Switch languages 3 times
      await view.setLanguage('eng', 0);
      await view.setLanguage('heb', 0);
      await view.setLanguage('eng', 0);

      const currencyChangedHandler = vi.fn();
      window.addEventListener('currency-changed', currencyChangedHandler);

      // Change currency to ILS
      const selector = document.querySelector('select.header-currency-selector[name="currency"]');
      selector.value = 'ils';
      selector.dispatchEvent(new Event('change', { bubbles: true }));

      // Verify currency-changed event fired exactly once
      // (If event delegation duplicated, this would fire multiple times)
      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);
      expect(currencyChangedHandler.mock.calls[0][0].detail.currency).toBe('ils');

      // Verify localStorage was updated
      expect(localStorage.getItem('currency')).toBe('ils');

      window.removeEventListener('currency-changed', currencyChangedHandler);
    });

    it('should handle multiple currency changes correctly', async () => {
      localStorage.setItem('currency', 'usd');

      await view.setLanguage('eng', 0);
      await view.setLanguage('heb', 0);
      await view.setLanguage('eng', 0);

      const currencyChangedHandler = vi.fn();
      window.addEventListener('currency-changed', currencyChangedHandler);

      const selector = document.querySelector('select.header-currency-selector[name="currency"]');

      // Change to ILS
      selector.value = 'ils';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      expect(currencyChangedHandler).toHaveBeenCalledTimes(1);

      // Change back to USD
      selector.value = 'usd';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      expect(currencyChangedHandler).toHaveBeenCalledTimes(2);

      // Change to ILS again
      selector.value = 'ils';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      expect(currencyChangedHandler).toHaveBeenCalledTimes(3);

      // Each change fires exactly once
      expect(localStorage.getItem('currency')).toBe('ils');

      window.removeEventListener('currency-changed', currencyChangedHandler);
    });
  });

  describe('Categories Tab - Cloning Cleanup', () => {
    it('should replace categories tab element on language switch', async () => {
      await view.setLanguage('eng', 0);

      const categoriesTab1 = document.querySelector('.categories-tab');
      expect(categoriesTab1).toBeTruthy();

      // Switch language - triggers cloneNode replacement
      await view.setLanguage('heb', 0);

      const categoriesTab2 = document.querySelector('.categories-tab');
      expect(categoriesTab2).toBeTruthy();

      // Element still exists in the DOM
      expect(categoriesTab2).not.toBe(categoriesTab1);
    });

    it('should preserve categories tab structure after cloning', async () => {
      await view.setLanguage('eng', 0);
      await view.setLanguage('heb', 0);

      const categoriesTab = document.querySelector('.categories-tab');
      expect(categoriesTab).toBeTruthy();

      // Structure should be preserved
      expect(categoriesTab.classList.contains('categories-tab')).toBe(true);
    });
  });

  describe('Mobile Menu SVG Handler - Cleanup on Re-render', () => {
    it('should not throw errors on repeated setLanguage calls without .menubars-svg', async () => {
      // svgHandler() expects .menubars-svg, but our minimal fixture doesn't have it
      // This tests that svgHandler() safely handles missing elements

      // Multiple language switches shouldn't throw errors
      await expect(view.setLanguage('eng', 0)).resolves.not.toThrow();
      await expect(view.setLanguage('heb', 0)).resolves.not.toThrow();
      await expect(view.setLanguage('eng', 0)).resolves.not.toThrow();
      await expect(view.setLanguage('heb', 0)).resolves.not.toThrow();
    });

    it('should handle svgHandler safely after 10 language switches', async () => {
      // Extreme case - 10 switches without .menubars-svg present
      for (let i = 0; i < 10; i++) {
        await expect(view.setLanguage(i % 2 === 0 ? 'eng' : 'heb', 0)).resolves.not.toThrow();
      }
    });
  });

  describe('View Instance Reuse Safety', () => {
    it('should handle multiple language cycles without degradation', async () => {
      // Create ONE View instance and cycle through 5 language switches
      await view.setLanguage('eng', 0);
      let menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      await view.setLanguage('heb', 0);
      menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      await view.setLanguage('eng', 0);
      menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      await view.setLanguage('heb', 0);
      menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      await view.setLanguage('eng', 0);
      menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      // Menu should still have links
      const menuLinks = menu.querySelectorAll('a');
      expect(menuLinks.length).toBeGreaterThan(0);
    });

    it('should maintain footer integrity across language switches', async () => {
      await view.setLanguage('eng', 0);
      let footer = document.querySelector('.footer');
      expect(footer).toBeTruthy();

      await view.setLanguage('heb', 0);
      footer = document.querySelector('.footer');
      expect(footer).toBeTruthy();

      await view.setLanguage('eng', 0);
      footer = document.querySelector('.footer');
      expect(footer).toBeTruthy();

      // Footer should have content
      expect(footer.innerHTML.length).toBeGreaterThan(0);
    });

    it('should handle 10 rapid language switches without errors', async () => {
      for (let i = 0; i < 10; i++) {
        await expect(view.setLanguage(i % 2 === 0 ? 'eng' : 'heb', 0)).resolves.not.toThrow();

        // Verify basic DOM integrity after each switch
        const menu = document.querySelector('.menu');
        expect(menu).toBeTruthy();

        const footer = document.querySelector('.footer');
        expect(footer).toBeTruthy();
      }
    });
  });
});
