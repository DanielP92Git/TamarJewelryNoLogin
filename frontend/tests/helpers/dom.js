/**
 * DOM testing helper utilities for frontend tests.
 *
 * These helpers simplify common DOM manipulation and testing tasks
 * in the jsdom environment.
 */

/**
 * Renders HTML string into document.body
 * @param {string} html - HTML string to render
 * @returns {Document} The document object for chaining
 */
export function renderHTML(html) {
  document.body.innerHTML = html;
  return document;
}

/**
 * Clears the DOM by resetting document.body to empty state
 */
export function clearDOM() {
  document.body.innerHTML = '';
}

/**
 * Creates a fresh localStorage mock with common methods
 * Useful for isolated tests that need to reset localStorage state
 * @returns {Object} Mock localStorage object with get/set/remove/clear methods
 */
export function mockLocalStorage() {
  const store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
}

/**
 * Waits for an element matching the selector to appear in the DOM
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 3000)
 * @returns {Promise<Element>} Resolves with the element when found
 * @throws {Error} If element is not found within timeout
 */
export function waitForDOM(selector, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);

    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Simulates a click event on an element
 * @param {Element} element - DOM element to click
 */
export function simulateClick(element) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(event);
}

/**
 * Simulates input on an input element (sets value and dispatches input event)
 * @param {HTMLInputElement} element - Input element to modify
 * @param {string} value - Value to set
 */
export function simulateInput(element, value) {
  element.value = value;

  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true
  });

  element.dispatchEvent(inputEvent);
}
