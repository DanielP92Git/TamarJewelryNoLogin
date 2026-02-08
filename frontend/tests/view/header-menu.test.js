/**
 * Header Menu Rendering and Navigation Tests (VIEW-09 and VIEW-10)
 *
 * Tests the View.js header menu functionality including:
 * - English navigation links with correct hrefs (VIEW-09)
 * - Hebrew navigation links with correct hrefs (VIEW-09)
 * - Category dropdown in both languages (VIEW-09)
 * - Menu state updates on language change (VIEW-10)
 * - Cart icon rendering in header utilities (VIEW-09)
 * - Cart number display updates (VIEW-10)
 * - Footer content updates on language change (VIEW-10)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../helpers/dom.js';
import View from '../../js/View.js';

describe('Header Menu Rendering and Navigation', () => {
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

  describe('English Navigation Links (VIEW-09)', () => {
    it('should render Home link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const homeLink = screen.getAllByRole('link', { name: /home/i })[0]; // First match (menu, not footer)
      expect(homeLink).toBeTruthy();
      expect(homeLink.href).toContain('/index.html');
    });

    it('should render Jewelry Workshop link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const jewelryWorkshopLinks = screen.getAllByRole('link', { name: /jewelry workshop/i });
      expect(jewelryWorkshopLinks.length).toBeGreaterThan(0);
      expect(jewelryWorkshopLinks[0].href).toContain('/html/jewelry-workshop.html');
    });

    it('should render About link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const aboutLinks = screen.getAllByRole('link', { name: /^about$/i });
      expect(aboutLinks.length).toBeGreaterThan(0);
      expect(aboutLinks[0].href).toContain('/html/about.html');
    });

    it('should render Contact Me link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const contactLinks = screen.getAllByRole('link', { name: /contact me/i });
      expect(contactLinks.length).toBeGreaterThan(0);
      expect(contactLinks[0].href).toContain('/html/contact-me.html');
    });

    it('should render Shop text in menu', async () => {
      await view.setLanguage('eng', 0);

      const shopElements = screen.getAllByText(/shop/i);
      expect(shopElements.length).toBeGreaterThan(0);
      expect(shopElements[0]).toBeTruthy();
    });
  });

  describe('English Category Dropdown (VIEW-09)', () => {
    it('should render Necklaces category link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const necklacesLinks = screen.getAllByRole('link', { name: /^necklaces$/i });
      expect(necklacesLinks.length).toBeGreaterThan(0);

      // Find the menu link (not footer) - menu link appears first
      const menuLink = necklacesLinks[0];
      expect(menuLink.href).toContain('/html/categories/necklaces.html');
    });

    it('should render Crochet Necklaces category link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const crochetLinks = screen.getAllByRole('link', { name: /crochet necklaces/i });
      expect(crochetLinks.length).toBeGreaterThan(0);
      expect(crochetLinks[0].href).toContain('/html/categories/crochetNecklaces.html');
    });

    it('should render Hoop Earrings category link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const hoopLinks = screen.getAllByRole('link', { name: /hoop earrings/i });
      expect(hoopLinks.length).toBeGreaterThan(0);
      expect(hoopLinks[0].href).toContain('/html/categories/hoops.html');
    });

    it('should render Dangle Earrings category link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const dangleLinks = screen.getAllByRole('link', { name: /dangle earrings/i });
      expect(dangleLinks.length).toBeGreaterThan(0);
      expect(dangleLinks[0].href).toContain('/html/categories/dangle.html');
    });

    it('should render categories list within categories tab', async () => {
      await view.setLanguage('eng', 0);

      const categoriesList = document.querySelector('.categories-list');
      expect(categoriesList).toBeTruthy();

      const categoriesTab = document.querySelector('.categories-tab');
      expect(categoriesTab).toBeTruthy();
      expect(categoriesTab.contains(categoriesList)).toBe(true);
    });
  });

  describe('Hebrew Navigation Links (VIEW-09)', () => {
    it('should render בית (Home) link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const homeLinks = screen.getAllByRole('link', { name: /בית/i });
      expect(homeLinks.length).toBeGreaterThan(0);
      expect(homeLinks[0].href).toContain('/index.html');
    });

    it('should render סדנאות תכשיטים (Jewelry Workshop) link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const workshopLinks = screen.getAllByRole('link', { name: /סדנאות תכשיטים/i });
      expect(workshopLinks.length).toBeGreaterThan(0);
      expect(workshopLinks[0].href).toContain('/html/jewelry-workshop.html');
    });

    it('should render אודות (About) link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const aboutLinks = screen.getAllByRole('link', { name: /^אודות$/i });
      expect(aboutLinks.length).toBeGreaterThan(0);
      expect(aboutLinks[0].href).toContain('/html/about.html');
    });

    it('should render צרו קשר (Contact Me) link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const contactLinks = screen.getAllByRole('link', { name: /צרו קשר/i });
      expect(contactLinks.length).toBeGreaterThan(0);
      expect(contactLinks[0].href).toContain('/html/contact-me.html');
    });

    it('should render חנות (Shop) text in menu', async () => {
      await view.setLanguage('heb', 0);

      const shopText = screen.getByText(/חנות/i);
      expect(shopText).toBeTruthy();
    });
  });

  describe('Hebrew Category Dropdown (VIEW-09)', () => {
    it('should render שרשראות (Necklaces) category link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const necklacesLinks = screen.getAllByRole('link', { name: /^שרשראות$/i });
      expect(necklacesLinks.length).toBeGreaterThan(0);
      expect(necklacesLinks[0].href).toContain('/html/categories/necklaces.html');
    });

    it('should render שרשראות סרוגות (Crochet Necklaces) category link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const crochetLinks = screen.getAllByRole('link', { name: /שרשראות סרוגות/i });
      expect(crochetLinks.length).toBeGreaterThan(0);
      expect(crochetLinks[0].href).toContain('/html/categories/crochetNecklaces.html');
    });

    it('should render עגילי חישוק (Hoop Earrings) category link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const hoopLinks = screen.getAllByRole('link', { name: /עגילי חישוק/i });
      expect(hoopLinks.length).toBeGreaterThan(0);
      expect(hoopLinks[0].href).toContain('/html/categories/hoops.html');
    });

    it('should render עגילים תלויים (Dangle Earrings) category link with correct href', async () => {
      await view.setLanguage('heb', 0);

      const dangleLinks = screen.getAllByRole('link', { name: /עגילים תלויים/i });
      expect(dangleLinks.length).toBeGreaterThan(0);
      expect(dangleLinks[0].href).toContain('/html/categories/dangle.html');
    });
  });

  describe('Menu State Updates on Language Change (VIEW-10)', () => {
    it('should replace English menu with Hebrew menu when language changes', async () => {
      // Start with English
      await view.setLanguage('eng', 0);

      // Verify English menu class present
      const menu = document.querySelector('.menu');
      expect(menu.querySelector('.ul-eng')).toBeTruthy();
      expect(menu.querySelector('.ul-heb')).toBeFalsy();

      // Switch to Hebrew
      await view.setLanguage('heb', 0);

      // Verify Hebrew menu class present and English menu class gone
      expect(menu.querySelector('.ul-heb')).toBeTruthy();
      expect(menu.querySelector('.ul-eng')).toBeFalsy();

      // Verify Hebrew text is present (use queryAllBy since text appears in menu and footer)
      expect(screen.queryAllByText(/בית/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/סדנאות תכשיטים/i).length).toBeGreaterThan(0);
    });

    it('should replace Hebrew menu with English menu when switching back', async () => {
      // Start with Hebrew
      await view.setLanguage('heb', 0);

      // Verify Hebrew menu class present
      const menu = document.querySelector('.menu');
      expect(menu.querySelector('.ul-heb')).toBeTruthy();
      expect(menu.querySelector('.ul-eng')).toBeFalsy();

      // Switch to English
      await view.setLanguage('eng', 0);

      // Verify English menu class present and Hebrew menu class gone
      expect(menu.querySelector('.ul-eng')).toBeTruthy();
      expect(menu.querySelector('.ul-heb')).toBeFalsy();

      // Verify English text is present (use queryAllBy since text appears in menu and footer)
      expect(screen.queryAllByText(/jewelry workshop/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/shop/i).length).toBeGreaterThan(0);
    });

    it('should fully replace menu content on each language change', async () => {
      // Start with English
      await view.setLanguage('eng', 0);
      const englishMenuHTML = document.querySelector('.menu').innerHTML;

      // Switch to Hebrew
      await view.setLanguage('heb', 0);
      const hebrewMenuHTML = document.querySelector('.menu').innerHTML;

      // Verify menu content is completely different
      expect(englishMenuHTML).not.toBe(hebrewMenuHTML);
      expect(hebrewMenuHTML).toContain('ul-heb');

      // Switch back to English
      await view.setLanguage('eng', 0);
      const englishMenuHTML2 = document.querySelector('.menu').innerHTML;

      // Verify English menu restored
      expect(englishMenuHTML2).toContain('ul-eng');
      expect(englishMenuHTML2).not.toContain('ul-heb');
    });
  });

  describe('Cart Icon in Header (VIEW-09)', () => {
    it('should render cart link in header utilities', async () => {
      await view.setLanguage('eng', 0);

      const cartLink = document.querySelector('.header-cart');
      expect(cartLink).toBeTruthy();
      expect(cartLink.tagName).toBe('A');
    });

    it('should render cart link with correct href', async () => {
      await view.setLanguage('eng', 0);

      const cartLink = document.querySelector('.header-cart');
      expect(cartLink.href).toContain('/html/cart.html');
    });

    it('should render cart number display element', async () => {
      await view.setLanguage('eng', 0);

      const cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber).toBeTruthy();
    });
  });

  describe('Cart Number Display (VIEW-10)', () => {
    it('should display cart number when passed to setLanguage', async () => {
      await view.setLanguage('eng', 5);

      const cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber.textContent).toBe('5');
    });

    it('should update cart number to 0 when cartNum is 0', async () => {
      await view.setLanguage('eng', 0);

      const cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber).toBeTruthy();
      expect(cartNumber.textContent).toBe('0');
    });

    it('should update cart number when language changes', async () => {
      // Start with English and cart count 3
      await view.setLanguage('eng', 3);
      let cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber.textContent).toBe('3');

      // Switch to Hebrew with cart count 7
      await view.setLanguage('heb', 7);
      cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber.textContent).toBe('7');

      // Switch back to English with cart count 1
      await view.setLanguage('eng', 1);
      cartNumber = document.querySelector('.cart-number-mobile');
      expect(cartNumber.textContent).toBe('1');
    });
  });

  describe('Footer Updates on Language Change (VIEW-10)', () => {
    it('should render English footer content', async () => {
      await view.setLanguage('eng', 0);

      const footer = document.querySelector('.footer');
      expect(footer.textContent).toContain('Shipping & Cancellation Policy');
      expect(footer.textContent).toContain('Tamar Kfir Jewelry. All Rights Reserved');
    });

    it('should render Hebrew footer content', async () => {
      await view.setLanguage('heb', 0);

      const footer = document.querySelector('.footer');
      expect(footer.textContent).toContain('מדיניות משלוח וביטול');
      expect(footer.textContent).toContain('תמר כפיר תכשיטים. כל הזכויות שמורות');
    });

    it('should update footer when language changes from English to Hebrew', async () => {
      await view.setLanguage('eng', 0);
      let footer = document.querySelector('.footer');
      expect(footer.textContent).toContain('Shipping & Cancellation Policy');

      await view.setLanguage('heb', 0);
      footer = document.querySelector('.footer');
      expect(footer.textContent).toContain('מדיניות משלוח וביטול');
      expect(footer.textContent).not.toContain('Shipping & Cancellation Policy');
    });

    it('should update footer when language changes from Hebrew to English', async () => {
      await view.setLanguage('heb', 0);
      let footer = document.querySelector('.footer');
      expect(footer.textContent).toContain('מדיניות משלוח וביטול');

      await view.setLanguage('eng', 0);
      footer = document.querySelector('.footer');
      expect(footer.textContent).toContain('Shipping & Cancellation Policy');
      expect(footer.textContent).not.toContain('מדיניות משלוח וביטול');
    });
  });
});
