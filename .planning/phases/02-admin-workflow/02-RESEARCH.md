# Phase 02: Admin Workflow - Research

**Researched:** 2026-02-01
**Domain:** Admin dashboard form validation, product listing tables, SKU search/filtering
**Confidence:** HIGH

## Summary

This phase implements SKU management in the existing admin dashboard (`/admin/BisliView.js` - a 3300+ line monolithic JavaScript file). The codebase uses vanilla JavaScript with a functional approach (no classes), DOM manipulation for UI updates, and fetch API for backend communication. The admin interface already has product add/edit forms and a product listing table - we're extending these with SKU fields, validation, search, and filtering capabilities.

The standard approach for 2026 admin interfaces combines inline validation (on blur) for immediate feedback, comprehensive error handling with actionable messages (including links to conflicting items for duplicates), and sessionStorage for filter state persistence across navigation. Modern table implementations use vanilla JavaScript libraries like `sortable` for column sorting, and both inline editing (pencil icon → popup) and bulk edit modes (editable table cells) are established UX patterns.

**Primary recommendation:** Extend existing forms with SKU input fields, implement blur-based validation with duplicate detection showing product links, add SKU column (2nd position) with sortable headers using lightweight vanilla JS patterns, provide both a unified search (search by name/ID/SKU) and a dedicated "Missing SKU" filter badge, and implement inline editing for quick SKU additions on legacy products.

## Standard Stack

The existing codebase is already established - no new libraries needed. All SKU features will be implemented using the current vanilla JavaScript approach.

### Core (Already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JavaScript | ES6+ | DOM manipulation, event handling | Project uses functional JS, no framework dependency |
| Fetch API | Native | HTTP requests to backend | Already used throughout BisliView.js |
| MongoDB + Mongoose | Current | Database with schema validation | SKU field already added in Phase 01 |
| Express.js | Current | REST API endpoints | Backend validation already implemented |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| sessionStorage | Filter/search state persistence | Store selected category, search term, filter state during navigation |
| CSS text-transform | Visual uppercase feedback | Display SKU input in uppercase while typing (CSS only, not for data) |
| JavaScript toUpperCase() | Data transformation | Transform SKU value on input event before submission |
| DOM querySelector/querySelectorAll | Element selection | All UI updates and event binding |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla JS table sorting | SortableJS library | Existing codebase avoids dependencies; simple column sorting doesn't justify library overhead |
| Inline validation | Submit-only validation | User research shows blur-based validation provides better UX for admin forms ([Smashing Magazine](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)) |
| Unified search field | Separate SKU search filter | Unified search reduces UI clutter while still supporting SKU searches |

**Installation:**
No new dependencies required - work within existing vanilla JavaScript architecture.

## Architecture Patterns

### Existing Admin Dashboard Structure
```
/admin/
├── index.html              # Shell with sidebar nav, breadcrumbs, page-content container
├── BisliView.js            # Monolithic JS file (~3300 lines)
│   ├── Navigation handlers (addProductsBtn, productsListBtn)
│   ├── API functions (fetchInfo, resolveApiUrl)
│   ├── Page renderers (loadProductsPage, loadAddProductsPage, editProduct)
│   ├── Form handlers (addProduct, addProductHandler)
│   └── Utility functions (loadProducts, setupBulkActions)
└── bambaYafa-desktop.css   # Admin dashboard styles
```

### Pattern 1: Form Field Extension
**What:** Add new fields to existing forms by extending the HTML markup strings and adding validation to submission handlers

**When to use:** Adding SKU field to Add Product and Edit Product forms

**Example:**
```javascript
// From BisliView.js loadAddProductsPage() - line 2988+
const markup = `
  <form id="uploadForm" class="page">
    <div class="card">
      <div class="card__body">
        <!-- Existing fields (name, description, category, etc.) -->

        <!-- NEW: SKU field at bottom of form -->
        <div class="field">
          <div class="label">
            SKU <span style="color: #ef4444;">*</span>
          </div>
          <input
            class="input"
            type="text"
            name="sku"
            id="sku-input"
            placeholder="ABC123"
            maxlength="7"
            required
          />
          <div class="help">Stock Keeping Unit - 2-7 alphanumeric characters (auto-converted to uppercase)</div>
          <div class="error-message" id="sku-error" style="display:none;"></div>
        </div>
      </div>
    </div>
  </form>
`;

pageContent.insertAdjacentHTML("afterbegin", markup);

// Bind auto-uppercase handler
const skuInput = document.getElementById('sku-input');
if (skuInput) {
  skuInput.addEventListener('input', (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(start, end); // Preserve cursor position
  });

  // Bind blur validation
  skuInput.addEventListener('blur', async () => {
    await validateSkuField(skuInput.value.trim());
  });
}
```

### Pattern 2: Inline Validation with Duplicate Detection
**What:** Validate SKU on blur event, check for duplicates via API, show error with link to conflicting product

**When to use:** SKU field validation on both Add and Edit Product forms

**Example:**
```javascript
// Validation function with duplicate detection
async function validateSkuField(skuValue, currentProductId = null) {
  const errorDiv = document.getElementById('sku-error');

  // Clear previous error
  errorDiv.style.display = 'none';
  errorDiv.innerHTML = '';

  // Empty validation
  if (!skuValue) {
    errorDiv.innerHTML = 'SKU is required for new products';
    errorDiv.style.display = 'block';
    return false;
  }

  // Format validation (client-side)
  const normalized = skuValue.toUpperCase();
  if (normalized.length < 2 || normalized.length > 7) {
    errorDiv.innerHTML = 'SKU must be between 2 and 7 characters';
    errorDiv.style.display = 'block';
    return false;
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    errorDiv.innerHTML = 'SKU must contain only letters and numbers (A-Z, 0-9)';
    errorDiv.style.display = 'block';
    return false;
  }

  // Duplicate check (server-side via API)
  try {
    const response = await fetch(`${API_URL}/check-sku-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify({
        sku: normalized,
        excludeProductId: currentProductId // For edit mode
      })
    });

    const result = await response.json();
    if (result.duplicate) {
      // Show error with link to conflicting product
      errorDiv.innerHTML = `SKU ${normalized} is already used by <a href="#" class="error-link" data-product-id="${result.conflictingProduct.id}">${result.conflictingProduct.name}</a> <span class="view-link">[View Product]</span>`;
      errorDiv.style.display = 'block';

      // Bind click handler to navigate to conflicting product
      const errorLink = errorDiv.querySelector('.error-link');
      if (errorLink) {
        errorLink.addEventListener('click', (e) => {
          e.preventDefault();
          // Navigate to edit page for conflicting product
          editProduct(result.conflictingProduct);
        });
      }

      return false;
    }
  } catch (error) {
    console.error('SKU duplicate check failed:', error);
    // Allow form submission - backend will catch duplicates
  }

  return true;
}
```
Source: Pattern informed by [Error Message UX](https://www.pencilandpaper.io/articles/ux-pattern-analysis-error-feedback) and [Smashing Magazine Error Messages](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/)

### Pattern 3: Table Column Extension with Sorting
**What:** Add SKU column to product listing table and implement clickable header sorting

**When to use:** Product listing table in loadProductsPage()

**Example:**
```javascript
// Update table header (line 952 in BisliView.js)
const markup = `
  <div class="table">
    <div class="listproduct-format-main">
      <p>Select</p>
      <p>Product</p>
      <p class="sortable-header" data-column="sku">
        SKU <span class="sort-indicator"></span>
      </p>
      <p class="hide-sm">Category</p>
      <p>Stock Qty</p>
      <p class="hide-sm">ILS</p>
      <p>Status</p>
      <p style="text-align:right;">Actions</p>
    </div>
    <div class="listproduct-allproducts"></div>
  </div>
`;

// Update loadProducts() to include SKU in product rows (line 1261)
productElement.innerHTML = `
  <div><!-- Select checkbox --></div>
  <div class="row__name"><!-- Product image/name --></div>
  <div class="mono">${item.sku || '—'}</div>
  <div class="mono hide-sm"><!-- Category --></div>
  <!-- ... rest of columns -->
`;

// Add sorting functionality
let sortState = { column: null, direction: 'asc' }; // Track sort state

function applySorting(data) {
  if (!sortState.column) return data;

  return [...data].sort((a, b) => {
    let aVal = a[sortState.column] || ''; // Treat missing SKU as empty
    let bVal = b[sortState.column] || '';

    // Put empty values at the end
    if (aVal === '' && bVal !== '') return 1;
    if (aVal !== '' && bVal === '') return -1;
    if (aVal === '' && bVal === '') return 0;

    // String comparison for SKU
    const comparison = aVal.localeCompare(bVal);
    return sortState.direction === 'asc' ? comparison : -comparison;
  });
}

// Bind header click handlers
document.querySelectorAll('.sortable-header').forEach(header => {
  header.addEventListener('click', () => {
    const column = header.dataset.column;

    // Toggle direction or set to asc for new column
    if (sortState.column === column) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.column = column;
      sortState.direction = 'asc';
    }

    // Update visual indicator
    document.querySelectorAll('.sort-indicator').forEach(ind => ind.textContent = '');
    const indicator = header.querySelector('.sort-indicator');
    indicator.textContent = sortState.direction === 'asc' ? ' ↑' : ' ↓';

    // Re-render products with sorting
    loadProducts(currentProductData);
  });
});
```
Source: Pattern adapted from [sortable library](https://github.com/tofsjonas/sortable) and [W3Schools Table Sorting](https://www.w3schools.com/howto/howto_js_sort_table.asp)

### Pattern 4: Search with Multiple Fields
**What:** Extend existing search to check SKU in addition to name and ID

**When to use:** Product search input handler (line 1006-1014 in BisliView.js)

**Example:**
```javascript
// Update loadProducts() search filter logic (line 1205-1211)
if (searchTerm) {
  filteredData = filteredData.filter((product) => {
    const name = (product.name || "").toLowerCase();
    const id = String(product.id ?? "").toLowerCase();
    const sku = (product.sku || "").toLowerCase(); // NEW: include SKU
    return name.includes(searchTerm) ||
           id.includes(searchTerm) ||
           sku.includes(searchTerm); // Partial match on SKU
  });
}
```
Source: Pattern follows existing search implementation, informed by [Algolia SKU Search](https://www.algolia.com/doc/guides/solutions/ecommerce/b2b-catalog-management/tutorials/search-by-sku)

### Pattern 5: Filter Badge for Missing SKUs
**What:** Add quick filter button showing count of products without SKUs

**When to use:** Toolbar in product listing page (line 911-930)

**Example:**
```javascript
// Add filter badge to toolbar
const markup = `
  <div class="toolbar">
    <div class="control">
      <input id="productSearch" class="input" type="text" placeholder="Search by product name, ID, SKU..." />
    </div>
    <div class="control">
      <select id="categoryFilter" class="select">
        <!-- ... categories ... -->
      </select>
    </div>
    <div class="control">
      <button id="missing-sku-filter" class="badge badge--clickable" style="cursor:pointer;">
        Missing SKU (<span id="missing-sku-count">0</span>)
      </button>
    </div>
    <div class="control">
      <div class="badge" id="resultsBadge">0 items</div>
    </div>
  </div>
`;

// State tracking
let filterState = {
  category: 'all',
  searchTerm: '',
  showMissingSku: false
};

// Bind filter badge click
document.getElementById('missing-sku-filter').addEventListener('click', () => {
  filterState.showMissingSku = !filterState.showMissingSku;

  // Update badge appearance
  const badge = document.getElementById('missing-sku-filter');
  if (filterState.showMissingSku) {
    badge.classList.add('badge--active'); // Add active styling
  } else {
    badge.classList.remove('badge--active');
  }

  // Persist filter state
  sessionStorage.setItem('filterState', JSON.stringify(filterState));

  loadProducts(currentProductData);
});

// Update loadProducts() to apply missing SKU filter
function loadProducts(data) {
  // ... existing category and search filters ...

  // NEW: Apply missing SKU filter
  if (filterState.showMissingSku) {
    filteredData = filteredData.filter(product => !product.sku || product.sku.trim() === '');
  }

  // Update missing SKU count
  const missingCount = data.filter(p => !p.sku || p.sku.trim() === '').length;
  document.getElementById('missing-sku-count').textContent = missingCount;

  // ... render products ...
}

// Restore filter state on page load
const savedState = sessionStorage.getItem('filterState');
if (savedState) {
  filterState = JSON.parse(savedState);
  if (filterState.showMissingSku) {
    document.getElementById('missing-sku-filter').classList.add('badge--active');
  }
}
```
Source: sessionStorage pattern from [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) and [React sessionStorage Guide](https://copyprogramming.com/howto/how-to-listen-sessionstorage-in-react-js)

### Pattern 6: Inline Editing for Quick Updates
**What:** Click SKU cell to edit in-place without leaving product list

**When to use:** Product listing table for quick SKU additions to legacy products

**Example:**
```javascript
// Make SKU cell editable in loadProducts() (line 1261+)
productElement.innerHTML = `
  <!-- ... other columns ... -->
  <div class="mono sku-cell" data-product-id="${item.id}" data-editable="true">
    <span class="sku-display">${item.sku || '—'}</span>
    <input
      type="text"
      class="sku-inline-input"
      value="${item.sku || ''}"
      maxlength="7"
      style="display:none;"
    />
  </div>
  <!-- ... other columns ... -->
`;

// Bind inline edit handlers
document.querySelectorAll('.sku-cell[data-editable="true"]').forEach(cell => {
  const display = cell.querySelector('.sku-display');
  const input = cell.querySelector('.sku-inline-input');
  const productId = cell.dataset.productId;

  // Click to edit
  display.addEventListener('click', () => {
    display.style.display = 'none';
    input.style.display = 'block';
    input.focus();
    input.select();
  });

  // Auto-uppercase while typing
  input.addEventListener('input', (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(start, end);
  });

  // Save on blur or Enter key
  const saveSku = async () => {
    const newSku = input.value.trim();

    // Validate format
    if (newSku && (newSku.length < 2 || newSku.length > 7 || !/^[A-Z0-9]+$/.test(newSku))) {
      alert('SKU must be 2-7 alphanumeric characters');
      input.focus();
      return;
    }

    try {
      // Update via API
      const response = await fetch(`${API_URL}/updateproduct/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ sku: newSku })
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error || 'Failed to update SKU');
        return;
      }

      // Update display
      display.textContent = newSku || '—';
      display.style.display = 'block';
      input.style.display = 'none';

      // Refresh product data
      await fetchInfo();
    } catch (error) {
      console.error('SKU update failed:', error);
      alert('Failed to update SKU. Please try again.');
    }
  };

  input.addEventListener('blur', saveSku);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSku();
    } else if (e.key === 'Escape') {
      // Cancel edit
      input.value = display.textContent === '—' ? '' : display.textContent;
      display.style.display = 'block';
      input.style.display = 'none';
    }
  });
});
```
Source: Pattern informed by [Admin Columns Inline Edit](https://www.admincolumns.com/inline-editing/)

### Anti-Patterns to Avoid
- **Premature validation**: Don't validate SKU on every keystroke - use blur event to avoid disrupting typing flow ([Smashing Magazine](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/))
- **Disabling submit button**: Don't disable "Add Product" until validation passes - let users attempt submission and show errors ([Form Validation Best Practices](https://ivyforms.com/blog/form-validation-best-practices/))
- **Generic error messages**: Don't say "SKU already exists" - show which product has the conflicting SKU with a link
- **Using CSS text-transform for data**: Don't rely on CSS `text-transform: uppercase` - it only affects display, not the actual value sent to server ([CodexWorld](https://www.codexworld.com/how-to/convert-text-to-uppercase-jquery-javascript-css/))
- **Cursor position bugs**: When auto-uppercasing input, always preserve cursor position using `setSelectionRange()` ([SheCode JavaScript](https://www.shecodes.io/athena/39504-how-to-change-text-input-to-uppercase-in-javascript))

## Don't Hand-Roll

Problems that look simple but have existing solutions or established patterns:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting | Custom sort algorithm with state management | Adapt patterns from [sortable library](https://github.com/tofsjonas/sortable) (lightweight, 2KB) | Handles edge cases like empty values, numeric vs string sorting, visual indicators, and accessibility |
| Duplicate SKU checking | Client-side duplicate detection only | Server-side validation via API endpoint (already exists: `/addproduct` endpoint validates SKU) | Client-side checks are advisory; server must enforce uniqueness constraint to prevent race conditions |
| Filter state persistence | Custom state management with complex logic | sessionStorage with JSON serialization ([MDN Guide](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)) | Built-in browser API, automatically scoped to tab, cleared on close |
| Form validation messages | Custom error display logic | Follow [Accessible Form Validation](https://www.uxpin.com/studio/blog/accessible-form-validation-best-practices/) patterns (ARIA attributes, error IDs, focus management) | Ensures screen reader compatibility and keyboard navigation |

**Key insight:** Admin interfaces have well-established UX patterns (validated by user research from Baymard Institute and Smashing Magazine). Following these patterns ensures usability and avoids reinventing solutions to solved problems like validation timing, error display, and state persistence.

## Common Pitfalls

### Pitfall 1: Form Submission Without Async Validation
**What goes wrong:** SKU duplicate check is async, but form submission continues before validation completes, allowing duplicates to reach the backend

**Why it happens:** JavaScript form submit handlers execute synchronously unless explicitly awaited

**How to avoid:** Make submit handler async and await SKU validation before proceeding
```javascript
submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  // Validate SKU before submission
  const skuInput = document.getElementById('sku-input');
  const isValid = await validateSkuField(skuInput.value, currentProductId);

  if (!isValid) {
    // Scroll to error and focus field
    skuInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    skuInput.focus();
    return; // Prevent submission
  }

  // Continue with form submission
  await addProduct(/* ... */);
});
```

**Warning signs:** Backend returns duplicate errors even after client-side validation appears to pass

### Pitfall 2: Search/Filter State Not Persisting
**What goes wrong:** Admin filters products to "Missing SKU", clicks edit on a product, saves changes, and returns to product list - filter is reset to "all products"

**Why it happens:** Page re-render from `loadProductsPage()` doesn't restore previous filter state from sessionStorage

**How to avoid:** Save filter state to sessionStorage on every change, restore on page load
```javascript
// Save state whenever filters change
function updateFilterState() {
  const state = {
    category: categoryFilter.value,
    searchTerm: productSearch.value,
    showMissingSku: filterState.showMissingSku
  };
  sessionStorage.setItem('productListFilters', JSON.stringify(state));
}

// Restore state when loading products page
async function loadProductsPage(data) {
  // ... render page markup ...

  // Restore filters from session
  const savedFilters = sessionStorage.getItem('productListFilters');
  if (savedFilters) {
    const state = JSON.parse(savedFilters);
    document.getElementById('categoryFilter').value = state.category;
    document.getElementById('productSearch').value = state.searchTerm;
    filterState.showMissingSku = state.showMissingSku;

    if (state.showMissingSku) {
      document.getElementById('missing-sku-filter').classList.add('badge--active');
    }
  }

  loadProducts(data);
}
```

**Warning signs:** Users complain they "keep losing their place" when editing products from filtered lists

### Pitfall 3: Edit Form Not Excluding Current Product from Duplicate Check
**What goes wrong:** Admin edits product with SKU "ABC123", doesn't change SKU field, saves - validation fails saying "SKU ABC123 already exists" (referring to itself)

**Why it happens:** Duplicate check query doesn't exclude the product being edited

**How to avoid:** Pass current product ID to validation function and exclude it from duplicate search
```javascript
// In editProduct() function
const currentProductId = product.id;

skuInput.addEventListener('blur', async () => {
  await validateSkuField(skuInput.value.trim(), currentProductId); // Pass product ID
});

// In validateSkuField()
async function validateSkuField(skuValue, excludeProductId = null) {
  // ... format validation ...

  const response = await fetch(`${API_URL}/check-sku-duplicate`, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({
      sku: normalized,
      excludeProductId: excludeProductId // Backend excludes this product from search
    })
  });
}
```

**Warning signs:** Edit form always shows duplicate error for unchanged SKU field

### Pitfall 4: Uppercase Input Breaks Cursor Position
**What goes wrong:** Admin types "abc" in SKU field, cursor jumps to end after each character (types "a", cursor jumps, types "b", cursor jumps again)

**Why it happens:** Using `input.value = input.value.toUpperCase()` without preserving cursor position causes browser to reset cursor to end of field

**How to avoid:** Capture cursor position before transformation, restore after using `setSelectionRange()`
```javascript
skuInput.addEventListener('input', (e) => {
  const start = e.target.selectionStart;  // Save cursor position
  const end = e.target.selectionEnd;
  e.target.value = e.target.value.toUpperCase();
  e.target.setSelectionRange(start, end); // Restore cursor position
});
```
Source: [SheCode JavaScript](https://www.shecodes.io/athena/39504-how-to-change-text-input-to-uppercase-in-javascript)

**Warning signs:** SKU field feels "jumpy" or "hard to type in" during testing

### Pitfall 5: Inline Edit Saves Without Validation
**What goes wrong:** Admin clicks SKU cell in product table, types "X" (1 character, invalid), clicks away - SKU is saved as "X" bypassing validation

**Why it happens:** Inline edit blur handler doesn't validate before calling update API

**How to avoid:** Validate format in inline edit save handler and prevent save if invalid
```javascript
const saveSku = async () => {
  const newSku = input.value.trim();

  // Format validation BEFORE API call
  if (newSku && (newSku.length < 2 || newSku.length > 7 || !/^[A-Z0-9]+$/.test(newSku))) {
    alert('SKU must be 2-7 alphanumeric characters');
    input.focus(); // Keep input focused to retry
    return; // Don't save
  }

  // ... API call ...
};
```

**Warning signs:** Products end up with invalid SKUs (1 character, special characters, etc.) after inline editing

## Code Examples

Verified patterns adapted from official sources and existing codebase:

### SKU Field Auto-Uppercase (Client-Side)
```javascript
// Source: Adapted from https://www.shecodes.io/athena/39504
const skuInput = document.getElementById('sku-input');

skuInput.addEventListener('input', (e) => {
  // Save cursor position to prevent jump
  const start = e.target.selectionStart;
  const end = e.target.selectionEnd;

  // Transform to uppercase
  e.target.value = e.target.value.toUpperCase();

  // Restore cursor position
  e.target.setSelectionRange(start, end);
});
```

### Duplicate SKU Validation with Error Link
```javascript
// Source: Pattern informed by Smashing Magazine error UX best practices
async function validateSkuField(skuValue, excludeProductId = null) {
  const errorDiv = document.getElementById('sku-error');
  errorDiv.style.display = 'none';
  errorDiv.innerHTML = '';

  if (!skuValue) {
    errorDiv.innerHTML = 'SKU is required for new products';
    errorDiv.style.display = 'block';
    errorDiv.setAttribute('role', 'alert'); // Accessibility
    return false;
  }

  const normalized = skuValue.toUpperCase().trim();

  // Format validation
  if (normalized.length < 2 || normalized.length > 7) {
    errorDiv.innerHTML = 'SKU must be between 2 and 7 characters';
    errorDiv.style.display = 'block';
    errorDiv.setAttribute('role', 'alert');
    return false;
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    errorDiv.innerHTML = 'SKU must contain only letters and numbers (A-Z, 0-9)';
    errorDiv.style.display = 'block';
    errorDiv.setAttribute('role', 'alert');
    return false;
  }

  // Duplicate check
  try {
    const response = await fetch(`${API_URL}/check-sku-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify({ sku: normalized, excludeProductId })
    });

    const result = await response.json();

    if (result.duplicate) {
      // Actionable error with link to conflicting product
      errorDiv.innerHTML = `
        SKU <strong>${normalized}</strong> is already used by
        <a href="#" class="error-link" data-product-id="${result.conflictingProduct.id}">
          ${result.conflictingProduct.name}
        </a>
        <span style="color: #3b82f6; cursor: pointer;">[View Product]</span>
      `;
      errorDiv.style.display = 'block';
      errorDiv.setAttribute('role', 'alert');

      // Bind navigation to conflicting product
      errorDiv.querySelector('.error-link').addEventListener('click', (e) => {
        e.preventDefault();
        editProduct(result.conflictingProduct);
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return true; // Allow submission - backend will validate
  }
}
```

### Table Column Sorting
```javascript
// Source: Adapted from https://github.com/tofsjonas/sortable patterns
let sortState = { column: null, direction: 'asc' };

function applySorting(products) {
  if (!sortState.column) return products;

  return [...products].sort((a, b) => {
    let aVal = a[sortState.column];
    let bVal = b[sortState.column];

    // Handle missing values (put at end)
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;

    // String comparison
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortState.direction === 'asc' ? comparison : -comparison;
  });
}

// Bind to SKU header
document.querySelector('[data-column="sku"]').addEventListener('click', (e) => {
  const column = 'sku';

  if (sortState.column === column) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.column = column;
    sortState.direction = 'asc';
  }

  // Update visual indicator
  document.querySelectorAll('.sort-indicator').forEach(ind => ind.textContent = '');
  e.currentTarget.querySelector('.sort-indicator').textContent =
    sortState.direction === 'asc' ? ' ↑' : ' ↓';

  // Re-render with sorted data
  loadProducts(currentProductData);
});
```

### Filter State Persistence
```javascript
// Source: MDN sessionStorage documentation
// Save state
function saveFilterState() {
  const state = {
    category: document.getElementById('categoryFilter').value,
    searchTerm: document.getElementById('productSearch').value,
    showMissingSku: filterState.showMissingSku,
    sortColumn: sortState.column,
    sortDirection: sortState.direction
  };
  sessionStorage.setItem('adminProductFilters', JSON.stringify(state));
}

// Restore state on page load
function restoreFilterState() {
  const saved = sessionStorage.getItem('adminProductFilters');
  if (!saved) return;

  try {
    const state = JSON.parse(saved);

    // Restore filters
    if (state.category) {
      document.getElementById('categoryFilter').value = state.category;
    }
    if (state.searchTerm) {
      document.getElementById('productSearch').value = state.searchTerm;
    }
    if (state.showMissingSku) {
      filterState.showMissingSku = true;
      document.getElementById('missing-sku-filter').classList.add('badge--active');
    }

    // Restore sort state
    if (state.sortColumn) {
      sortState.column = state.sortColumn;
      sortState.direction = state.sortDirection;

      const header = document.querySelector(`[data-column="${state.sortColumn}"]`);
      if (header) {
        header.querySelector('.sort-indicator').textContent =
          state.sortDirection === 'asc' ? ' ↑' : ' ↓';
      }
    }
  } catch (error) {
    console.error('Failed to restore filter state:', error);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Submit-only validation | Blur-based inline validation | ~2020 ([Smashing Magazine 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)) | Better UX - users get immediate feedback without disrupting typing flow |
| Generic "already exists" errors | Actionable errors with links to conflicting items | 2020s UX research | Reduces admin frustration - they can immediately view and resolve conflicts |
| localStorage for all persistence | sessionStorage for temporary UI state | Modern SPA patterns (2023+) | Better state hygiene - filters don't persist across browser restarts |
| Complex table libraries (DataTables, etc.) | Lightweight vanilla JS patterns | 2024-2026 trend away from jQuery | Smaller bundles, better performance, easier to customize |
| Separate search fields per column | Unified search across multiple fields | Modern admin UI pattern | Cleaner UI, matches user expectations from consumer apps |

**Deprecated/outdated:**
- **jQuery-based table plugins**: Modern vanilla JS approaches (like `sortable`) are lighter and don't require jQuery dependency
- **Real-time validation on keyup**: UX research shows blur-based validation is less disruptive ([Smashing Magazine](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/))
- **CSS text-transform for data transformation**: Only affects display, not form values - use JavaScript ([CodexWorld](https://www.codexworld.com/how-to/convert-text-to-uppercase-jquery-javascript-css/))

## Open Questions

Things that couldn't be fully resolved:

1. **Bulk Edit Mode Implementation**
   - What we know: User wants both inline editing (click cell to edit) AND bulk edit mode (edit multiple SKUs at once, save all)
   - What's unclear: Should bulk edit be a separate "Bulk Edit SKUs" button that transforms the table, or a mode toggle?
   - Recommendation: Implement inline edit first (simpler, covers single-SKU updates), defer bulk edit mode to separate task if needed. Inline edit handles most use cases.

2. **Backend API Endpoint for Duplicate Check**
   - What we know: `/addproduct` and `/updateproduct` endpoints already validate SKU uniqueness (Phase 01), but don't provide duplicate checking as a separate endpoint
   - What's unclear: Should we create a dedicated `/check-sku-duplicate` endpoint for client-side validation, or just rely on submission errors?
   - Recommendation: Create `/check-sku-duplicate` endpoint for better UX - allows showing actionable errors before submission. Endpoint should:
     - Accept `{ sku, excludeProductId? }` in request body
     - Return `{ duplicate: boolean, conflictingProduct?: { id, name } }`
     - Require authentication (admin only)

3. **Missing SKU Filter Badge Behavior**
   - What we know: Filter should show count like "Missing SKU (23)" and be clickable
   - What's unclear: Should clicking again toggle OFF the filter (return to all products), or require a separate "Clear Filters" action?
   - Recommendation: Make it a toggle - clicking when active removes the filter. This matches common filter chip behavior in modern UIs.

## Sources

### Primary (HIGH confidence)
- [Smashing Magazine - Inline Validation Web Forms UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) - Validation timing best practices
- [MDN - sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) - State persistence patterns
- [MDN - Client-side Form Validation](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation) - Native HTML5 validation
- [GitHub - sortable](https://github.com/tofsjonas/sortable) - Lightweight table sorting patterns
- [Admin Columns - Inline Editing](https://www.admincolumns.com/inline-editing/) - Inline edit UX patterns
- Existing codebase (`/admin/BisliView.js`, `/backend/index.js`) - Current architecture and patterns

### Secondary (MEDIUM confidence)
- [Baymard Institute - Form Validation UX](https://baymard.com/blog/inline-form-validation) - Usability testing results
- [UXPin - Accessible Form Validation](https://www.uxpin.com/studio/blog/accessible-form-validation-best-practices/) - Accessibility guidelines
- [Smashing Magazine - Error Messages UX](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/) - Error handling patterns
- [Algolia - Searching by SKU](https://www.algolia.com/doc/guides/solutions/ecommerce/b2b-catalog-management/tutorials/search-by-sku) - SKU search implementation
- [SheCode - JavaScript Uppercase Input](https://www.shecodes.io/athena/39504-how-to-change-text-input-to-uppercase-in-javascript) - Auto-uppercase pattern
- [CodexWorld - Convert Text to Uppercase](https://www.codexworld.com/how-to/convert-text-to-uppercase-jquery-javascript-css/) - CSS vs JS approaches

### Tertiary (LOW confidence)
- [IvyForms - Form Validation Best Practices](https://ivyforms.com/blog/form-validation-best-practices/) - General validation guidance
- [Pencil & Paper - Error Message UX](https://www.pencilandpaper.io/articles/ux-pattern-analysis-error-feedback) - Error feedback patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing codebase fully analyzed, no new dependencies needed
- Architecture: HIGH - patterns verified against existing code (`BisliView.js` lines 892-3233), validated with official documentation
- Pitfalls: HIGH - common issues identified from form validation research and cursor position handling
- UX patterns: MEDIUM - validated by research (Smashing Magazine, Baymard) but not tested in this specific codebase
- Inline edit implementation: MEDIUM - pattern well-established (Admin Columns) but needs adaptation to vanilla JS approach

**Research date:** 2026-02-01
**Valid until:** ~60 days (March 2026) - form validation and admin UI patterns are stable, unlikely to change
