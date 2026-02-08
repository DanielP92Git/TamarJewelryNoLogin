/**
 * Home Page View Tests (PAGE-12)
 *
 * Tests home page category rendering and language switching:
 * - PAGE-12: Home page view renders jewelry category sections
 * - Category names display correctly in English and Hebrew
 * - Hebrew text uses Rubik font family
 * - Page-specific language method updates categories
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';
import homePageView from '../../js/Views/homePageView.js';

describe('Home Page View', () => {
  beforeEach(() => {
    // Render DOM fixture required by HomePageView
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="category-name category-name_necklaces">Necklaces</div>
      <div class="category-name category-name_crochet-necklaces">Crochet Necklaces</div>
      <div class="category-name category-name_hoops">Hoop Earrings</div>
      <div class="category-name category-name_bracelets">Bracelets</div>
      <div class="category-name category-name_dangle">Dangle Earrings</div>
      <div class="category-name category-name_unisex">Unisex Jewelry</div>
    `);

    // Reset language to default
    localStorage.setItem('language', 'eng');
  });

  afterEach(() => {
    // Clear mocks
    vi.restoreAllMocks();
  });

  describe('Category Rendering (PAGE-12)', () => {
    it('should render all jewelry category names in English', () => {
      // Set categories to English
      homePageView.setCategoriesLng('eng');

      // Verify all 6 category names are in English
      const necklaces = document.querySelector('.category-name_necklaces');
      const crochetNecklaces = document.querySelector('.category-name_crochet-necklaces');
      const hoops = document.querySelector('.category-name_hoops');
      const bracelets = document.querySelector('.category-name_bracelets');
      const dangle = document.querySelector('.category-name_dangle');
      const unisex = document.querySelector('.category-name_unisex');

      expect(necklaces.textContent).toBe('Necklaces');
      expect(crochetNecklaces.textContent).toBe('Crochet Necklaces');
      expect(hoops.textContent).toBe('Hoop Earrings');
      expect(bracelets.textContent).toBe('Bracelets');
      expect(dangle.textContent).toBe('Dangle Earrings');
      expect(unisex.textContent).toBe('Unisex Jewelry');
    });

    it('should render all jewelry category names in Hebrew', () => {
      // Set categories to Hebrew
      homePageView.setCategoriesLng('heb');

      // Verify all 6 category names are in Hebrew
      const necklaces = document.querySelector('.category-name_necklaces');
      const crochetNecklaces = document.querySelector('.category-name_crochet-necklaces');
      const hoops = document.querySelector('.category-name_hoops');
      const bracelets = document.querySelector('.category-name_bracelets');
      const dangle = document.querySelector('.category-name_dangle');
      const unisex = document.querySelector('.category-name_unisex');

      expect(necklaces.textContent).toBe('שרשראות');
      expect(crochetNecklaces.textContent).toBe('שרשראות סרוגות');
      expect(hoops.textContent).toBe('עגילי חישוק');
      expect(bracelets.textContent).toBe('צמידים');
      expect(dangle.textContent).toBe('עגילים תלויים');
      expect(unisex.textContent).toBe('תכשיטי יוניסקס');
    });

    it('should set Hebrew font family when language is Hebrew', () => {
      // Set categories to Hebrew
      homePageView.setCategoriesLng('heb');

      // Verify all category elements have Rubik font family
      const categoryElements = document.querySelectorAll('.category-name');
      expect(categoryElements.length).toBe(6);

      categoryElements.forEach(element => {
        expect(element.style.fontFamily).toContain('Rubik');
      });
    });

    it('should set page-specific language via setPageSpecificLanguage', () => {
      // Mock handleFooterMarkup to avoid footer rendering issues
      const handleFooterMock = vi.spyOn(homePageView, 'handleFooterMarkup').mockImplementation(() => {});

      // Call setPageSpecificLanguage (which calls setCategoriesLng internally)
      homePageView.setPageSpecificLanguage('eng', 0);

      // Verify categories are set to English
      const necklaces = document.querySelector('.category-name_necklaces');
      expect(necklaces.textContent).toBe('Necklaces');

      // Now switch to Hebrew
      homePageView.setPageSpecificLanguage('heb', 0);

      // Verify categories are now in Hebrew
      expect(necklaces.textContent).toBe('שרשראות');

      // Verify handleFooterMarkup was called
      expect(handleFooterMock).toHaveBeenCalled();
    });
  });
});
