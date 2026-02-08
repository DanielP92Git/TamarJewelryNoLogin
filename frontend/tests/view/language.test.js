/**
 * Language Selector and Switching Tests (VIEW-01 through VIEW-04)
 *
 * Tests the View.js language functionality including:
 * - Language selector rendering with flag icons (VIEW-01)
 * - Switching from English to Hebrew (VIEW-02)
 * - Switching from Hebrew to English (VIEW-03)
 * - RTL layout changes during language switching (VIEW-04)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '../helpers/dom.js';
import View from '../../js/View.js';

describe('Language Selector and Switching', () => {
  let view;

  beforeEach(() => {
    // Render minimal DOM fixture required by View constructor
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);

    // Instantiate View
    view = new View();
  });

  afterEach(() => {
    // Reset module-level currency persistence flag so it re-initializes cleanly
    delete window.__currencyPersistenceInitialized;
  });

  describe('Language Selector Rendering (VIEW-01)', () => {
    it('should render flag icons for both English and Hebrew in desktop selector', async () => {
      await view.setLanguage('eng', 0);

      const desktopSelector = document.querySelector('.desktop-lang-selector');
      expect(desktopSelector).toBeTruthy();

      const engFlag = desktopSelector.querySelector('.flag-icon.flag-eng');
      const hebFlag = desktopSelector.querySelector('.flag-icon.flag-heb');

      expect(engFlag).toBeTruthy();
      expect(hebFlag).toBeTruthy();

      // Verify English flag is selected
      expect(engFlag.classList.contains('selected')).toBe(true);
      expect(hebFlag.classList.contains('selected')).toBe(false);
    });

    it('should render flag icons for both English and Hebrew in mobile selector', async () => {
      await view.setLanguage('eng', 0);

      const mobileSelector = document.querySelector('.mobile-lang-selector');
      expect(mobileSelector).toBeTruthy();

      const engFlag = mobileSelector.querySelector('.flag-icon.flag-eng');
      const hebFlag = mobileSelector.querySelector('.flag-icon.flag-heb');

      expect(engFlag).toBeTruthy();
      expect(hebFlag).toBeTruthy();

      // Verify English flag is selected
      expect(engFlag.classList.contains('selected')).toBe(true);
      expect(hebFlag.classList.contains('selected')).toBe(false);
    });

    it('should render desktop language selector within header utilities container', async () => {
      await view.setLanguage('eng', 0);

      const headerUtilities = document.querySelector('[data-purpose="header-utilities"]');
      expect(headerUtilities).toBeTruthy();

      const desktopSelector = headerUtilities.querySelector('.desktop-lang-selector');
      expect(desktopSelector).toBeTruthy();
    });

    it('should render mobile language selector within menu container', async () => {
      await view.setLanguage('eng', 0);

      const menu = document.querySelector('.menu');
      expect(menu).toBeTruthy();

      const mobileSelector = menu.querySelector('.mobile-lang-selector');
      expect(mobileSelector).toBeTruthy();
    });

    it('should show Hebrew flag as selected when language is Hebrew', async () => {
      await view.setLanguage('heb', 0);

      const desktopSelector = document.querySelector('.desktop-lang-selector');
      const engFlag = desktopSelector.querySelector('.flag-icon.flag-eng');
      const hebFlag = desktopSelector.querySelector('.flag-icon.flag-heb');

      // Verify Hebrew flag is selected
      expect(hebFlag.classList.contains('selected')).toBe(true);
      expect(engFlag.classList.contains('selected')).toBe(false);
    });
  });

  describe('Switch to Hebrew (VIEW-02)', () => {
    it('should update localStorage language to "heb" when switching to Hebrew', async () => {
      // Initialize with English (manually set localStorage as setLanguage doesn't do it)
      localStorage.setItem('language', 'eng');
      await view.setLanguage('eng', 0);

      view.changeToHeb();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(localStorage.getItem('language')).toBe('heb');
    });

    it('should update document.documentElement.lang to "he" when switching to Hebrew', async () => {
      await view.setLanguage('eng', 0);
      document.documentElement.lang = 'en'; // Explicitly set for test clarity

      view.changeToHeb();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.lang).toBe('he');
    });

    it('should render Hebrew menu text after switching to Hebrew', async () => {
      await view.setLanguage('heb', 0);

      // Query Hebrew menu text (בית = Home, חנות = Shop, אודות = About)
      const menuText = document.querySelector('.menu').textContent;
      expect(menuText).toContain('בית');
      expect(menuText).toContain('חנות');
      expect(menuText).toContain('אודות');
    });

    it('should switch to Hebrew via changeToHeb() method', async () => {
      await view.setLanguage('eng', 0);

      view.changeToHeb();
      // Wait for async setLanguage to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(localStorage.getItem('language')).toBe('heb');
      expect(document.documentElement.lang).toBe('he');

      const menuText = document.querySelector('.menu').textContent;
      expect(menuText).toContain('בית');
    });
  });

  describe('Switch to English (VIEW-03)', () => {
    it('should update localStorage language to "eng" when switching to English', async () => {
      // Initialize with Hebrew (manually set localStorage as setLanguage doesn't do it)
      localStorage.setItem('language', 'heb');
      await view.setLanguage('heb', 0);

      view.changeToEng();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(localStorage.getItem('language')).toBe('eng');
    });

    it('should update document.documentElement.lang to "en" when switching to English', async () => {
      await view.setLanguage('heb', 0);
      document.documentElement.lang = 'he'; // Explicitly set for test clarity

      view.changeToEng();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.lang).toBe('en');
    });

    it('should render English menu text after switching to English', async () => {
      await view.setLanguage('eng', 0);

      const menuText = document.querySelector('.menu').textContent;
      expect(menuText).toContain('Home');
      expect(menuText).toContain('Shop');
      expect(menuText).toContain('About');
    });

    it('should switch to English via changeToEng() method', async () => {
      await view.setLanguage('heb', 0);

      view.changeToEng();
      // Wait for async setLanguage to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(localStorage.getItem('language')).toBe('eng');
      expect(document.documentElement.lang).toBe('en');

      const menuText = document.querySelector('.menu').textContent;
      expect(menuText).toContain('Home');
    });
  });

  describe('RTL Layout Changes (VIEW-04)', () => {
    it('should set document.documentElement.dir to "rtl" when switching to Hebrew', async () => {
      await view.setLanguage('eng', 0);
      document.documentElement.dir = 'ltr'; // Explicitly set for test clarity

      view.changeToHeb();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('should set document.documentElement.dir to "ltr" when switching to English', async () => {
      await view.setLanguage('heb', 0);
      document.documentElement.dir = 'rtl'; // Explicitly set for test clarity

      view.changeToEng();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should add dir="rtl" attribute to Hebrew currency selector', async () => {
      await view.setLanguage('heb', 0);

      const currencySelectors = document.querySelectorAll('select.header-currency-selector');
      expect(currencySelectors.length).toBeGreaterThan(0);

      // At least one selector should have dir="rtl"
      const rtlSelector = Array.from(currencySelectors).find(sel => sel.getAttribute('dir') === 'rtl');
      expect(rtlSelector).toBeTruthy();
    });

    it('should NOT have dir="rtl" attribute on English currency selector', async () => {
      await view.setLanguage('eng', 0);

      const currencySelectors = document.querySelectorAll('select.header-currency-selector');
      expect(currencySelectors.length).toBeGreaterThan(0);

      // No selector should have dir="rtl"
      const rtlSelector = Array.from(currencySelectors).find(sel => sel.getAttribute('dir') === 'rtl');
      expect(rtlSelector).toBeFalsy();
    });

    it('should correctly toggle dir attribute during round-trip language changes', async () => {
      // Start with English
      await view.setLanguage('eng', 0);
      document.documentElement.dir = 'ltr';
      expect(document.documentElement.dir).toBe('ltr');

      // Switch to Hebrew
      view.changeToHeb();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.dir).toBe('rtl');

      // Switch back to English
      view.changeToEng();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.dir).toBe('ltr');

      // Switch to Hebrew again
      view.changeToHeb();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('should maintain RTL layout when switching to Hebrew via changeToHeb()', async () => {
      await view.setLanguage('eng', 0);

      view.changeToHeb();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(document.documentElement.dir).toBe('rtl');

      // Verify currency selector also has RTL
      const currencySelectors = document.querySelectorAll('select.header-currency-selector');
      const rtlSelector = Array.from(currencySelectors).find(sel => sel.getAttribute('dir') === 'rtl');
      expect(rtlSelector).toBeTruthy();
    });

    it('should remove RTL layout when switching to English via changeToEng()', async () => {
      await view.setLanguage('heb', 0);

      view.changeToEng();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(document.documentElement.dir).toBe('ltr');

      // Verify currency selector does not have RTL
      const currencySelectors = document.querySelectorAll('select.header-currency-selector');
      const rtlSelector = Array.from(currencySelectors).find(sel => sel.getAttribute('dir') === 'rtl');
      expect(rtlSelector).toBeFalsy();
    });
  });
});
