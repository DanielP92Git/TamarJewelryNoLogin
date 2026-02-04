import { describe, it, expect, beforeEach } from 'vitest';
import { renderHTML, clearDOM, mockLocalStorage } from './helpers/dom.js';

describe('Frontend Test Infrastructure', () => {
  beforeEach(() => {
    clearDOM();
  });

  it('should have access to document and window', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('should be able to render and query DOM', () => {
    renderHTML('<div id="test-element">Hello</div>');
    const element = document.getElementById('test-element');
    expect(element).toBeDefined();
    expect(element.textContent).toBe('Hello');
  });

  it('should have localStorage available', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('should clean up localStorage between tests', () => {
    // Previous test set 'test-key', this test should not see it
    // (setup.js afterEach clears localStorage)
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should be able to add event listeners', () => {
    let clicked = false;
    renderHTML('<button id="test-btn">Click me</button>');
    const btn = document.getElementById('test-btn');
    btn.addEventListener('click', () => { clicked = true; });
    btn.click();
    expect(clicked).toBe(true);
  });
});
