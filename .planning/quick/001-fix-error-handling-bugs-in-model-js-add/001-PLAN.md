---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/js/model.js
  - frontend/tests/model/api.test.js
  - frontend/tests/model/localStorage.test.js
autonomous: true

must_haves:
  truths:
    - "addToUserStorage handles network errors without unhandled promise rejections"
    - "createLocalStorage handles QuotaExceededError without crashing"
    - "Both functions log errors to console for debugging"
  artifacts:
    - path: "frontend/js/model.js"
      provides: "Error-handled cart storage functions"
      contains: "catch.*QuotaExceeded"
  key_links:
    - from: "addToUserStorage"
      to: "console.error"
      via: ".catch()"
      pattern: "\\.catch\\("
    - from: "createLocalStorage"
      to: "console.error"
      via: "try-catch"
      pattern: "try.*catch.*QuotaExceeded"
---

<objective>
Fix two error handling bugs in model.js discovered during Phase 18 testing:
1. addToUserStorage lacks error handling (unhandled promise rejections on network failure)
2. createLocalStorage lacks quota error handling (crashes when localStorage is full)

Purpose: Improve frontend resilience and prevent unhandled errors from crashing cart operations
Output: Robust error handling with console logging for both functions
</objective>

<execution_context>
@C:\Users\pagis\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\pagis\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@frontend/js/model.js
@frontend/tests/model/api.test.js
@frontend/tests/model/localStorage.test.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add error handling to addToUserStorage</name>
  <files>frontend/js/model.js</files>
  <action>
Update addToUserStorage (lines 165-178) to catch network errors:

Current pattern (promise chain with no error handling):
```javascript
export const addToUserStorage = data => {
  const itemId = data.dataset.id;
  fetch(`${host}/addtocart`, { ... })
    .then(response => response.json())
    .then(idData => idData);
};
```

Change to (add .catch() at end of chain):
```javascript
export const addToUserStorage = data => {
  const itemId = data.dataset.id;
  fetch(`${host}/addtocart`, {
    method: 'POST',
    headers: {
      Accept: 'application/form-data',
      'auth-token': `${localStorage.getItem('auth-token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ itemId: itemId }),
  })
    .then(response => response.json())
    .then(idData => idData)
    .catch(error => {
      console.error('Failed to add item to cart:', error);
    });
};
```

The .catch() prevents unhandled promise rejections and logs the error for debugging.
  </action>
  <verify>Run: `cd frontend && npm test -- --run model/api.test.js`
Tests should pass, and the "Network Failures" tests should no longer need workarounds.</verify>
  <done>addToUserStorage has .catch() handler that logs errors without crashing</done>
</task>

<task type="auto">
  <name>Task 2: Add quota error handling to createLocalStorage</name>
  <files>frontend/js/model.js</files>
  <action>
Update createLocalStorage (line 184-186) to handle QuotaExceededError:

Current implementation (no error handling):
```javascript
const createLocalStorage = function () {
  localStorage.setItem('cart', JSON.stringify(cart));
};
```

Change to (wrap in try-catch):
```javascript
const createLocalStorage = function () {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.error('localStorage quota exceeded. Cart not saved:', error);
    } else {
      console.error('Failed to save cart to localStorage:', error);
    }
  }
};
```

Notes:
- error.code === 22 is the legacy way to check for QuotaExceededError (Safari)
- Logs specific message for quota errors vs other storage errors
- Does not throw - cart operations continue even if storage fails
  </action>
  <verify>Run: `cd frontend && npm test -- --run model/localStorage.test.js`
All tests should pass. The quota test at line 334 should now reflect implemented handling.</verify>
  <done>createLocalStorage has try-catch that handles QuotaExceededError gracefully</done>
</task>

<task type="auto">
  <name>Task 3: Update tests to verify error handling</name>
  <files>frontend/tests/model/api.test.js, frontend/tests/model/localStorage.test.js</files>
  <action>
Update test comments and assertions to reflect the fixes:

1. In api.test.js, update the network failure test (lines 212-228):
   - Remove the NOTE comment about lacking error handling
   - Update assertion to verify console.error is called instead of silently catching

2. In localStorage.test.js, update the quota test (lines 334-349):
   - Change title from "should verify localStorage.setItem is called (quota handling not implemented)"
   - To: "should handle localStorage quota exceeded gracefully"
   - Add console.error spy to verify error is logged
   - Mock localStorage.setItem to throw QuotaExceededError
   - Verify function doesn't throw and logs error

Example updated quota test:
```javascript
it('should handle localStorage quota exceeded gracefully', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    const error = new Error('QuotaExceededError');
    error.name = 'QuotaExceededError';
    throw error;
  });

  const product = createProduct();
  const mockElement = createMockProductElement(product);

  // Should not throw
  expect(() => {
    addToLocalStorage(mockElement);
  }).not.toThrow();

  // Should log error
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('quota exceeded'),
    expect.any(Error)
  );

  setItemSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});
```
  </action>
  <verify>Run: `cd frontend && npm test -- --run`
All model tests should pass (77+ tests).</verify>
  <done>Tests validate error handling behavior for both addToUserStorage and createLocalStorage</done>
</task>

</tasks>

<verification>
1. Run all model tests: `cd frontend && npm test -- --run model/`
2. Verify no test failures and no unhandled promise rejection warnings
3. Verify console.error spy assertions pass in updated tests
</verification>

<success_criteria>
- addToUserStorage has .catch() that logs network errors
- createLocalStorage has try-catch that handles QuotaExceededError
- Both functions continue operation after errors (no crashes)
- All model tests pass (77+)
- Test comments no longer reference "not implemented" for error handling
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-error-handling-bugs-in-model-js-add/001-SUMMARY.md`
</output>
