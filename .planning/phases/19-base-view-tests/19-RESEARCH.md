# Phase 19: Base View Tests - Research

**Researched:** 2026-02-08
**Domain:** Frontend View Layer Testing (Vanilla JavaScript MVC)
**Confidence:** HIGH

## Summary

Phase 19 tests the base View class (`frontend/js/View.js`), which provides shared functionality for all page-specific views in the MVC architecture. The View class manages language switching (English/Hebrew with RTL), currency switching (USD/ILS), header menu rendering, and event listener lifecycle.

**Key architectural insights:**
- View.js uses event delegation via document-level listeners for currency changes (no cleanup needed)
- Language/currency selectors are rendered into existing DOM containers during `setLanguage()`
- Flag icons use click handlers attached during render (need cleanup strategy)
- Mobile menu uses element cloning to remove old listeners (anti-pattern but current implementation)
- Header menu HTML is completely replaced on language change, recreating all DOM nodes

**Primary recommendation:** Test language/currency switching by verifying DOM updates and localStorage changes. Test event cleanup by tracking listener references and checking for memory leaks using beforeEach/afterEach cleanup verification.

## Standard Stack

The test infrastructure is already established from Phase 17. All testing libraries are installed and configured.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | Latest | Test runner | Fast, Vite-native, ESM support |
| happy-dom | Latest | Browser environment | 2-3x faster than jsdom, full DOM API |
| @testing-library/dom | Latest | Semantic queries | Industry standard for accessible DOM testing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | Latest | Realistic interactions | Multi-step user flows (typing, clicking) |
| vitest vi.fn() | Built-in | Mock functions | Tracking function calls, assertions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| happy-dom | jsdom | More mature but 2-3x slower (Phase 17 decision) |
| @testing-library | querySelector | More brittle, less accessible (Phase 17 decision) |

**Installation:**
Already installed. No additional packages needed.

## Architecture Patterns

### Test File Organization
```
frontend/tests/
├── view/                    # View layer tests (NEW for Phase 19)
│   ├── language.test.js    # VIEW-01 through VIEW-04
│   ├── currency.test.js    # VIEW-05 through VIEW-08
│   ├── header-menu.test.js # VIEW-09, VIEW-10
│   └── cleanup.test.js     # VIEW-11
├── helpers/
│   ├── dom.js              # Existing: render(), screen, simulateClick()
│   ├── factories.js        # Existing: createProduct(), etc.
│   └── mocks/
│       ├── fetch.js        # Existing: setupFetchMock()
│       └── dom-elements.js # Existing: createMockProductElement()
└── setup.js                # Existing: beforeEach/afterEach cleanup
```

### Pattern 1: Testing View Instantiation and DOM Setup
**What:** Create View instance, verify DOM containers exist, test initial state
**When to use:** All View tests need a valid DOM structure before testing behavior
**Example:**
```javascript
// Source: Analysis of View.js constructor and setLanguage()
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '../helpers/dom.js';
import View from '../../js/View.js';

describe('View: Language Switching', () => {
  let view;

  beforeEach(() => {
    // Render minimal header structure that View.js expects
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);

    // Instantiate View (selects elements in constructor)
    view = new View();
  });

  it('should switch to Hebrew with RTL layout', async () => {
    await view.setLanguage('heb', 0);

    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem('language')).toBe('heb');
  });
});
```

### Pattern 2: Testing Currency Switching with Event Simulation
**What:** Simulate currency selector change, verify custom event dispatch and localStorage
**When to use:** Testing currency switching (VIEW-05, VIEW-06, VIEW-07)
**Example:**
```javascript
// Source: View.js lines 55-72 (event delegation for currency)
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('View: Currency Switching', () => {
  let view;
  let currencyChangedHandler;

  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);

    view = new View();
    await view.setLanguage('eng', 0);

    // Setup listener for custom event
    currencyChangedHandler = vi.fn();
    window.addEventListener('currency-changed', currencyChangedHandler);
  });

  it('should switch from USD to ILS', () => {
    const selector = document.querySelector('select.header-currency-selector[name="currency"]');

    // Simulate user changing select value
    selector.value = 'ils';
    selector.dispatchEvent(new Event('change', { bubbles: true }));

    expect(localStorage.getItem('currency')).toBe('ils');
    expect(currencyChangedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { currency: 'ils' }
      })
    );
  });
});
```

### Pattern 3: Testing Menu Rendering and Navigation Links
**What:** Verify menu HTML contains correct navigation links for each language
**When to use:** Testing header menu rendering (VIEW-09)
**Example:**
```javascript
// Source: View.js lines 603-693 (handleMenuLanguage)
import { screen } from '@testing-library/dom';

describe('View: Header Menu', () => {
  it('should render English navigation links', async () => {
    render(`<header></header><div class="menu"></div><div data-purpose="header-utilities"></div><div class="footer"></div>`);
    const view = new View();

    await view.setLanguage('eng', 0);

    // Use semantic queries to verify links
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/index.html');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/html/about.html');
    expect(screen.getByText(/shop/i)).toBeDefined();
  });

  it('should render Hebrew navigation links with RTL text', async () => {
    render(`<header></header><div class="menu"></div><div data-purpose="header-utilities"></div><div class="footer"></div>`);
    const view = new View();

    await view.setLanguage('heb', 0);

    expect(screen.getByRole('link', { name: /בית/i })).toHaveAttribute('href', '/index.html');
    expect(screen.getByRole('link', { name: /אודות/i })).toHaveAttribute('href', '/html/about.html');
    expect(screen.getByText(/חנות/i)).toBeDefined();
  });
});
```

### Pattern 4: Testing Event Listener Cleanup
**What:** Track event listener additions, verify cleanup after view operations
**When to use:** Testing memory leak prevention (VIEW-11)
**Example:**
```javascript
// Source: View.js lines 806-831 (flag click handlers)
describe('View: Event Cleanup', () => {
  it('should not accumulate listeners on repeated language switches', async () => {
    render(`<header></header><div class="menu"></div><div data-purpose="header-utilities"></div><div class="footer"></div>`);
    const view = new View();

    // Switch languages multiple times
    await view.setLanguage('eng', 0);
    const flagsAfterFirst = document.querySelectorAll('.flag-icon');
    const firstFlagClickCount = countEventListeners(flagsAfterFirst[0], 'click');

    await view.setLanguage('heb', 0);
    await view.setLanguage('eng', 0);

    const flagsAfterThird = document.querySelectorAll('.flag-icon');
    const thirdFlagClickCount = countEventListeners(flagsAfterThird[0], 'click');

    // Should not accumulate listeners (should replace elements)
    expect(thirdFlagClickCount).toBeLessThanOrEqual(firstFlagClickCount + 1);
  });
});
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't verify internal method calls or private state. Test observable behavior (DOM changes, localStorage, events).
- **Mocking View internals:** View.js has module-level initialization (lines 76-78). Don't mock internal functions. Test the public API.
- **Hard-coded selector strings:** Use semantic queries (getByRole, getByText) over querySelector when possible. Makes tests resilient to class name changes.
- **Ignoring async operations:** setLanguage() is async. Always await it in tests to avoid race conditions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM event simulation | Custom event creation | @testing-library/user-event | Handles focus, blur, keyboard events properly |
| Waiting for DOM updates | setTimeout loops | @testing-library/waitFor | Proper polling with timeout and clear error messages |
| Event listener counting | Reflection/debugging APIs | Test observable behavior (DOM changes) | No standard API for listener introspection in Happy-DOM |
| Currency persistence | Manual localStorage mocking | Happy-DOM built-in localStorage | Provided by environment, no mock needed |

**Key insight:** View.js uses module-level initialization (lines 76-78) that runs on import. This means currency event delegation is set up immediately. Tests should work with this rather than trying to isolate it.

## Common Pitfalls

### Pitfall 1: Module-Level Initialization Side Effects
**What goes wrong:** View.js lines 76-78 initialize currency persistence on module import. This adds a document-level 'change' listener that persists across tests.
**Why it happens:** ES6 modules execute once on first import. Side effects at module level affect all subsequent tests.
**How to avoid:**
- Accept that document-level currency listener exists (it uses event delegation, safe across tests)
- Clear localStorage in afterEach (already done in setup.js)
- Don't try to mock or remove the module-level listener
**Warning signs:** Tests fail with "listener already attached" or currency changes affect other tests

### Pitfall 2: Menu HTML Replacement Creates New DOM Nodes
**What goes wrong:** `setLanguage()` replaces entire `.menu` innerHTML (line 736), destroying all child elements and their listeners. Tests expecting elements to persist fail.
**Why it happens:** View.js regenerates menu HTML from scratch rather than updating in place.
**How to avoid:**
- Query for elements AFTER calling setLanguage()
- Don't cache element references from before language switch
- Verify new elements have correct attributes, not object identity
**Warning signs:** "Element not found" errors after language switch, or stale element references

### Pitfall 3: Flag Click Handlers Added Without Cleanup
**What goes wrong:** Lines 806-831 attach click handlers to flag icons after rendering. Multiple language switches could theoretically accumulate handlers.
**Why it happens:** No explicit removeEventListener calls. View.js relies on element replacement to "clean up" by destroying old nodes.
**How to avoid:**
- Test that flags respond to clicks (behavior test)
- Don't try to count listeners (no standard API in Happy-DOM)
- If testing cleanup, verify localStorage only updates once per click
**Warning signs:** Currency/language changes multiple times from one click

### Pitfall 4: Async setLanguage Without Await
**What goes wrong:** `setLanguage()` is async (lines 695-948), but tests that don't await it see incomplete DOM state.
**Why it happens:** setLanguage calls async `setPageSpecificLanguage()` hook (line 946)
**How to avoid:**
- Always `await view.setLanguage(lng, cartNum)` in tests
- Use async test functions: `it('test', async () => { ... })`
- If testing page-specific views, mock or implement setPageSpecificLanguage
**Warning signs:** Intermittent test failures, missing DOM elements, "Cannot read property of undefined"

### Pitfall 5: Cart Number Updates Without Elements
**What goes wrong:** `persistCartNumber()` expects `.cart-number-mobile` elements (lines 308-322). Tests without proper header structure fail silently.
**Why it happens:** View methods assume full page HTML structure exists
**How to avoid:**
- Always render header structure before instantiating View
- Include cart number elements in test fixtures
- Test with valid HTML from actual index.html structure
**Warning signs:** Cart numbers don't update, no error thrown (method returns early at line 312)

## Code Examples

Verified patterns from actual View.js implementation:

### Language Switching Flow (VIEW-02, VIEW-03, VIEW-04)
```javascript
// Source: View.js lines 552-596 (changeToHeb, changeToEng, setLanguage)
// Complete flow from user action to DOM update

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../helpers/dom.js';
import View from '../../js/View.js';

describe('View: Language Switching Complete Flow', () => {
  beforeEach(() => {
    // Minimal structure View.js needs
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);
    localStorage.clear();
  });

  it('should complete Hebrew switch flow', async () => {
    const view = new View();

    // User clicks Hebrew flag -> calls changeToHeb()
    view.changeToHeb();

    // Verify immediate localStorage update (line 556)
    expect(localStorage.getItem('language')).toBe('heb');

    // Verify document attributes (lines 557-562)
    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');

    // setLanguage is called synchronously, need to wait for it
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify menu was re-rendered with Hebrew text (line 736)
    expect(screen.getByText(/בית/)).toBeDefined(); // "Home" in Hebrew
    expect(screen.getByText(/חנות/)).toBeDefined(); // "Shop" in Hebrew
  });

  it('should complete English switch flow', async () => {
    const view = new View();

    // Start from Hebrew
    await view.setLanguage('heb', 0);

    // User clicks English flag -> calls changeToEng()
    view.changeToEng();

    expect(localStorage.getItem('language')).toBe('eng');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(screen.getByText(/Home/i)).toBeDefined();
    expect(screen.getByText(/Shop/i)).toBeDefined();
  });
});
```

### Currency Selector Rendering and Event Handling (VIEW-05, VIEW-06, VIEW-07)
```javascript
// Source: View.js lines 950-1003 (getCurrencySelectorMarkup, updateCurrencySelectorText)
// and lines 55-72 (event delegation for currency changes)

describe('View: Currency Selector', () => {
  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);
    localStorage.clear();
    localStorage.setItem('currency', 'usd'); // Default
  });

  it('should render USD/ILS options in English', async () => {
    const view = new View();
    await view.setLanguage('eng', 0);

    const selector = document.querySelector('select.header-currency-selector[name="currency"]');
    expect(selector).toBeDefined();

    // Verify options (lines 957-964)
    const options = Array.from(selector.options);
    expect(options[0].value).toBe('default');
    expect(options[0].text).toBe('Currency');
    expect(options[1].value).toBe('usd');
    expect(options[1].text).toBe('USD');
    expect(options[2].value).toBe('ils');
    expect(options[2].text).toBe('ILS');
  });

  it('should render currency options in Hebrew', async () => {
    const view = new View();
    await view.setLanguage('heb', 0);

    const selector = document.querySelector('select.header-currency-selector[name="currency"]');

    // Verify Hebrew text (lines 967-974)
    const options = Array.from(selector.options);
    expect(options[0].text).toBe('מטבע'); // "Currency"
    expect(options[1].text).toBe('דולר'); // "USD"
    expect(options[2].text).toBe('שקל'); // "ILS"

    // Verify RTL direction
    expect(selector.getAttribute('dir')).toBe('rtl');
  });

  it('should persist currency change to localStorage', async () => {
    const view = new View();
    await view.setLanguage('eng', 0);

    const selector = document.querySelector('select.header-currency-selector[name="currency"]');

    // Simulate user changing currency (triggers event delegation on line 55)
    selector.value = 'ils';
    selector.dispatchEvent(new Event('change', { bubbles: true }));

    // Verify persistence (line 67)
    expect(localStorage.getItem('currency')).toBe('ils');
  });

  it('should dispatch custom event on currency change', async () => {
    const view = new View();
    await view.setLanguage('eng', 0);

    const eventHandler = vi.fn();
    window.addEventListener('currency-changed', eventHandler);

    const selector = document.querySelector('select.header-currency-selector[name="currency"]');
    selector.value = 'ils';
    selector.dispatchEvent(new Event('change', { bubbles: true }));

    // Verify custom event (lines 69-71)
    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { currency: 'ils' }
      })
    );
  });
});
```

### Header Menu Navigation Structure (VIEW-09, VIEW-10)
```javascript
// Source: View.js lines 603-693 (handleMenuLanguage)

describe('View: Header Menu Structure', () => {
  beforeEach(() => {
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
    `);
  });

  it('should render complete English navigation', async () => {
    const view = new View();
    await view.setLanguage('eng', 0);

    // Verify main tabs (lines 606-644)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/index.html');
    expect(screen.getByRole('link', { name: /jewelry workshop/i })).toHaveAttribute('href', '/html/jewelry-workshop.html');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/html/about.html');
    expect(screen.getByRole('link', { name: /contact me/i })).toHaveAttribute('href', '/html/contact-me.html');

    // Verify shop dropdown exists
    expect(screen.getByText(/shop/i)).toBeDefined();
  });

  it('should render category dropdown links', async () => {
    const view = new View();
    await view.setLanguage('eng', 0);

    // Verify categories (lines 612-634)
    expect(screen.getByRole('link', { name: /necklaces/i })).toHaveAttribute('href', '/html/categories/necklaces.html');
    expect(screen.getByRole('link', { name: /crochet necklaces/i })).toHaveAttribute('href', '/html/categories/crochetNecklaces.html');
    expect(screen.getByRole('link', { name: /hoop earrings/i })).toHaveAttribute('href', '/html/categories/hoops.html');
    expect(screen.getByRole('link', { name: /dangle earrings/i })).toHaveAttribute('href', '/html/categories/dangle.html');
  });

  it('should render Hebrew navigation with correct order', async () => {
    const view = new View();
    await view.setLanguage('heb', 0);

    // Hebrew menu has same DOM order (mobile), CSS reverses for desktop (line 649 comment)
    expect(screen.getByRole('link', { name: /בית/i })).toHaveAttribute('href', '/index.html');
    expect(screen.getByRole('link', { name: /סדנאות תכשיטים/i })).toHaveAttribute('href', '/html/jewelry-workshop.html');
    expect(screen.getByRole('link', { name: /אודות/i })).toHaveAttribute('href', '/html/about.html');
    expect(screen.getByRole('link', { name: /צרו קשר/i })).toHaveAttribute('href', '/html/contact-me.html');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global currency listener per view | Module-level event delegation (lines 76-78) | Current codebase | Single listener for all currency changes, more efficient |
| Direct element.remove() for cleanup | Element cloning to drop old listeners (line 161) | Current codebase | Anti-pattern but functional, avoids listener tracking |
| Separate language selectors | Flag icon dropdown (lines 757-803) | Current codebase | Visual improvement, requires click handlers |
| Manual currency text updates | updateCurrencySelectorText helper (lines 979-1003) | Current codebase | Centralizes currency label translation logic |

**Deprecated/outdated:**
- Commented-out login/logout handler (lines 324-344): Not tested, not in use
- Language button click handlers (lines 904-908): Appear unused, flag icons are primary UI now

## Open Questions

Things that couldn't be fully resolved:

1. **Event listener cleanup verification**
   - What we know: View.js uses element cloning (line 161) and innerHTML replacement (line 736) to implicitly remove listeners
   - What's unclear: No explicit cleanup API provided. Tests can verify behavior but not listener count.
   - Recommendation: Test observable behavior (clicks work, no duplicate actions) rather than listener internals. Document in tests that View relies on DOM node replacement for cleanup.

2. **Mobile vs Desktop behavior differences**
   - What we know: Lines 847-896 show different hover/click behavior based on viewport width
   - What's unclear: How to test responsive behavior in Happy-DOM (no real media query evaluation)
   - Recommendation: Test both code paths by manually setting `window.matchMedia` mock. Document that tests don't verify actual responsive layout, only JavaScript logic branches.

3. **Page-specific language updates**
   - What we know: setPageSpecificLanguage() is a hook for subclasses (line 599-601)
   - What's unclear: Whether base View tests should verify this hook mechanism
   - Recommendation: Base View tests should verify hook is called (if not undefined). Page-specific view tests (Phase 20-22) will test the implementations.

## Sources

### Primary (HIGH confidence)
- View.js source code (C:\Users\pagis\OneDrive\WebDev\Projects\Online\frontend\js\View.js) - complete implementation analysis
- locale.js source code - currency and language normalization functions
- model.js source code - cart structure and localStorage patterns
- index.html - header structure and DOM containers View.js expects

### Secondary (MEDIUM confidence)
- Existing test infrastructure (infrastructure.test.js, cart.test.js) - established patterns from Phase 17-18
- setup.js - beforeEach/afterEach cleanup strategies
- vitest.config.js - environment configuration

### Tertiary (LOW confidence)
- None - all research based on codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - already established in Phase 17, no changes needed
- Architecture: HIGH - analyzed actual View.js implementation, not assumptions
- Pitfalls: HIGH - identified from actual code patterns (innerHTML replacement, module-level init)

**Research date:** 2026-02-08
**Valid until:** 30 days (stable patterns, not fast-moving API)
