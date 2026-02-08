/**
 * DOM element mock helpers for model.js testing.
 *
 * The model.js addToLocalStorage function reads from DOM elements with specific
 * data-* attributes and child elements. This helper creates properly structured
 * mock elements for testing cart operations.
 */

/**
 * Create a mock product element matching the structure expected by addToLocalStorage.
 *
 * The model.js function reads:
 * - data-id: Product ID
 * - data-quant: Available quantity
 * - data-currency: Currency code ('$' or 'ils')
 * - data-usd-price: USD price
 * - data-ils-price: ILS price
 * - data-original-usd-price: Original USD price (before discount)
 * - data-original-ils-price: Original ILS price (before discount)
 * - .front-image child element with src attribute
 * - .item-title child element with textContent
 * - .item-price-discounted child element (presence indicates discount)
 *
 * @param {Object} product - Product data from factory
 * @param {Object} options - Additional options
 * @param {string} options.currency - Currency code ('$' or 'ils', default: 'ils')
 * @param {boolean} options.hasDiscount - Whether product has discount price
 * @returns {HTMLElement} Mock DOM element
 */
export function createMockProductElement(product, options = {}) {
  const element = document.createElement('div');

  // Set data attributes
  element.setAttribute('data-id', product.id);
  element.setAttribute('data-quant', product.quantity || 10);
  element.setAttribute('data-currency', options.currency || 'ils');
  element.setAttribute('data-usd-price', product.usd_price || 50);
  element.setAttribute('data-ils-price', product.ils_price || 185);
  element.setAttribute('data-original-usd-price', product.usd_price || 50);
  element.setAttribute('data-original-ils-price', product.ils_price || 185);

  // Create required child elements
  const img = document.createElement('img');
  img.className = 'front-image';
  img.src = product.images?.[0]?.desktop || 'test.jpg';
  element.appendChild(img);

  const title = document.createElement('span');
  title.className = 'item-title';
  title.textContent = product.name;
  element.appendChild(title);

  // Optional: add discount price element if product has discount
  if (options.hasDiscount) {
    const discountPrice = document.createElement('span');
    discountPrice.className = 'item-price-discounted';
    element.appendChild(discountPrice);
  }

  return element;
}
