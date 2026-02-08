/**
 * DOM testing helper utilities for frontend tests.
 *
 * Provides both Testing Library semantic queries (recommended)
 * and legacy DOM manipulation utilities for backward compatibility.
 */

import { getQueriesForElement, screen as tScreen } from '@testing-library/dom';

/**
 * Renders HTML and returns Testing Library queries bound to document.body.
 * Recommended for new tests - provides semantic queries (getByRole, getByText, etc).
 *
 * @param {string} html - HTML string to render
 * @returns {Object} Object with all query methods bound to document.body
 *
 * @example
 * const { getByRole, getByText } = render('<button>Click Me</button>');
 * const button = getByRole('button', { name: /click me/i });
 */
export function render(html) {
  document.body.innerHTML = html;
  return {
    ...getQueriesForElement(document.body),
    container: document.body
  };
}

// Re-export screen for global queries (convenience)
export const screen = tScreen;

/**
 * Renders HTML string into document.body (legacy function).
 * Use `render()` for new tests - it provides Testing Library queries.
 *
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
