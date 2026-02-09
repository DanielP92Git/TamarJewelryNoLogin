/**
 * Bidirectional text tests.
 *
 * Verifies that English SKU codes display correctly in Hebrew (RTL) mode.
 * The app sets dir="ltr" on SKU value spans to force left-to-right rendering
 * for alphanumeric codes (e.g., "TK-001") within an RTL page layout.
 *
 * Limitation: No <bdi> elements are used for mixed-direction inline text.
 * Product titles in Hebrew do not have explicit bidi markup - they rely on
 * document-level dir="rtl" for correct rendering. This is acceptable for v1.3.
 *
 * Requirements: LOCALE-10
 */

import { describe, it, expect, beforeEach } from 'vitest';
import categoriesView from '../../js/Views/categoriesView.js';

describe('Bidirectional text handling', () => {
  describe('SKU markup generation', () => {
    it('generates SKU markup with dir="ltr" attribute', () => {
      const mockView = { lang: 'heb' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-001'
      );

      expect(result).toContain('dir="ltr"');
      expect(result).toContain('TK-001');
    });

    it('sets dir="ltr" on sku-value span in Hebrew mode', () => {
      const mockView = { lang: 'heb' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-123'
      );

      // Should have Hebrew label
      expect(result).toContain('מק״ט:');
      // Should have LTR span
      expect(result).toContain('<span class="sku-value" dir="ltr">TK-123</span>');
    });

    it('sets dir="ltr" on sku-value span in English mode', () => {
      const mockView = { lang: 'eng' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-456'
      );

      // Should have English label
      expect(result).toContain('SKU:');
      // Should still have LTR span (always)
      expect(result).toContain('<span class="sku-value" dir="ltr">TK-456</span>');
    });

    it('applies dir="ltr" to placeholder text when SKU missing', () => {
      const mockView = { lang: 'heb' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        ''
      );

      // Should have Hebrew placeholder
      expect(result).toContain('לא זמין');
      // Should have LTR span even for placeholder
      expect(result).toContain('<span class="sku-value" dir="ltr">לא זמין</span>');
    });

    it('includes data-sku attribute only when SKU has value', () => {
      const mockView = { lang: 'heb' };

      const withValue = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-789'
      );
      const withoutValue = categoriesView._generateSkuMarkup.call(
        mockView,
        ''
      );

      expect(withValue).toContain('data-sku="TK-789"');
      expect(withoutValue).not.toContain('data-sku');
    });

    it('adds placeholder class when SKU is missing', () => {
      const mockView = { lang: 'heb' };

      const withValue = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-001'
      );
      const withoutValue = categoriesView._generateSkuMarkup.call(
        mockView,
        null
      );

      expect(withValue).toContain('class="product-sku"');
      expect(withValue).not.toContain('product-sku--placeholder');
      expect(withoutValue).toContain('class="product-sku product-sku--placeholder"');
    });

    it('handles SKU codes with various alphanumeric patterns', () => {
      const mockView = { lang: 'heb' };

      const testCases = [
        'TK-001',
        'RING-2024',
        'NC-ABC123',
        '123-456',
        'PROD_789',
      ];

      testCases.forEach(sku => {
        const result = categoriesView._generateSkuMarkup.call(
          mockView,
          sku
        );
        expect(result).toContain('dir="ltr"');
        expect(result).toContain(sku);
      });
    });
  });

  describe('Language-specific labels', () => {
    it('uses Hebrew label in Hebrew mode', () => {
      const mockView = { lang: 'heb' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-001'
      );

      expect(result).toContain('<span class="sku-label">מק״ט:</span>');
    });

    it('uses English label in English mode', () => {
      const mockView = { lang: 'eng' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-001'
      );

      expect(result).toContain('<span class="sku-label">SKU:</span>');
    });

    it('uses Hebrew placeholder in Hebrew mode', () => {
      const mockView = { lang: 'heb' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        ''
      );

      expect(result).toContain('>לא זמין<');
    });

    it('uses English placeholder in English mode', () => {
      const mockView = { lang: 'eng' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        ''
      );

      expect(result).toContain('>Not available<');
    });
  });

  describe('Edge cases', () => {
    it('handles whitespace-only SKU as missing', () => {
      const mockView = { lang: 'eng' };
      const result = categoriesView._generateSkuMarkup.call(
        mockView,
        '   '
      );

      expect(result).toContain('Not available');
      expect(result).toContain('product-sku--placeholder');
      expect(result).not.toContain('data-sku');
    });

    it('preserves tabindex="0" for keyboard navigation when SKU exists', () => {
      const mockView = { lang: 'eng' };

      const withValue = categoriesView._generateSkuMarkup.call(
        mockView,
        'TK-001'
      );
      const withoutValue = categoriesView._generateSkuMarkup.call(
        mockView,
        ''
      );

      expect(withValue).toContain('tabindex="0"');
      expect(withoutValue).not.toContain('tabindex');
    });
  });
});
