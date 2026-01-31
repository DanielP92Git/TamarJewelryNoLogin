# Architecture Research: SKU Management Integration

**Domain:** E-commerce product management (SKU field addition)
**Researched:** 2026-02-01
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend Layer (MVC)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ Admin Forms │  │ Product     │  │ Cart View   │                  │
│  │ (HTML)      │  │ Modal View  │  │ (Display)   │                  │
│  └─────┬───────┘  └─────┬───────┘  └─────┬───────┘                  │
│        │                │                │                           │
│        └────────────────┴────────────────┘                           │
│                         │                                            │
│                   ┌─────▼─────┐                                      │
│                   │ model.js  │  (State + API calls)                 │
│                   └─────┬─────┘                                      │
└─────────────────────────┼──────────────────────────────────────────┘
                          │ (fetch API)
┌─────────────────────────▼──────────────────────────────────────────┐
│                       Backend Layer (Express)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │ POST /addproduct     │  │ POST /updateproduct  │                 │
│  │ (Create product)     │  │ (Edit product)       │                 │
│  └──────────┬───────────┘  └──────────┬───────────┘                 │
│             │                          │                             │
│             └──────────────┬───────────┘                             │
│                            │                                         │
│                  ┌─────────▼──────────┐                              │
│                  │ normalizeProductFor│                              │
│                  │ Client()           │                              │
│                  │ (Transform data)   │                              │
│                  └─────────┬──────────┘                              │
└────────────────────────────┼───────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                        Database Layer (MongoDB)                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Product Schema (Mongoose)                 │    │
│  │  - id, name, description, category                           │    │
│  │  - mainImage, smallImages (complex objects)                  │    │
│  │  - ils_price, usd_price, discount_percentage                 │    │
│  │  - quantity, available, security_margin                      │    │
│  │  → SKU field to be added here                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | File Location |
|-----------|----------------|---------------|
| **Product Schema** | Define database structure, validation, indexes | `backend/models/Product.js` |
| **Backend API Routes** | Handle HTTP requests, validate input, transform data | `backend/index.js` (monolithic) |
| **normalizeProductForClient()** | Transform DB product → client-safe JSON (absolute URLs, omit locals) | `backend/index.js:347-460` |
| **Admin Forms** | HTML forms for add/edit product (not found in current scan) | Likely `frontend/admin/` or similar |
| **Frontend Model** | Cart state, API calls, localStorage management | `frontend/js/model.js` |
| **Product Display Views** | Render products with language switching, currency conversion | `frontend/js/Views/categoriesView.js` |

## Recommended Project Structure for SKU Integration

```
backend/
├── models/
│   └── Product.js              # ADD: sku field to schema (String, unique, sparse)
│
├── index.js                    # MODIFY: Two endpoints
│   ├── POST /addproduct        # ADD: Accept req.body.sku, validate uniqueness
│   ├── POST /updateproduct     # ADD: Accept req.body.sku, validate uniqueness
│   └── normalizeProductForClient()  # NO CHANGE: SKU passes through as-is

frontend/
├── admin/                      # MODIFY: Admin forms (HTML)
│   ├── [add-form].html         # ADD: <input name="sku"> field
│   └── [edit-form].html        # ADD: <input name="sku"> field with pre-filled value
│
├── js/
│   └── Views/
│       └── categoriesView.js   # MODIFY: Product modal display
│           └── generatePreview() # ADD: Display SKU in modal (line ~604-898)

css/
└── [modal-styles].css          # ADD: Styling for SKU display in modal
```

### Structure Rationale

- **Schema first**: Database changes drive all downstream components. Without the field in Mongoose, API can't save it.
- **Backend routes second**: API must accept and validate SKU before frontend can submit it.
- **Admin forms third**: Forms depend on working API to save data.
- **Frontend display last**: Display is optional/cosmetic; core functionality works without it.

## Architectural Patterns

### Pattern 1: Mongoose Schema Extension

**What:** Add new field to existing Mongoose schema with validation constraints

**When to use:** Any time a new product attribute needs to be stored and queried

**Trade-offs:**
- ✅ Pro: Centralized validation at database layer
- ✅ Pro: Automatic indexing for performance
- ⚠️ Con: Requires DB migration strategy for existing products (null/undefined SKU)

**Example:**
```javascript
// backend/models/Product.js
const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  sku: {
    type: String,
    unique: true,      // Enforce uniqueness
    sparse: true,      // Allow null/undefined for old products
    trim: true,        // Remove whitespace
    uppercase: true    // Normalize to uppercase
  },
  // ... existing fields
});
```

### Pattern 2: Backend Route Validation (Unique Constraint)

**What:** Validate SKU uniqueness before save, handle edit vs. create logic

**When to use:** When business rule requires unique identifiers across all products

**Trade-offs:**
- ✅ Pro: Clear error messages to admin user
- ✅ Pro: Prevents duplicate data at application layer
- ⚠️ Con: Race condition possible (two simultaneous adds with same SKU)

**Example:**
```javascript
// backend/index.js - POST /addproduct
app.post('/addproduct', adminRateLimiter, fetchUser, requireAdmin, async (req, res) => {
  const { sku } = req.body;

  // Validate SKU uniqueness (if provided)
  if (sku) {
    const existing = await Product.findOne({
      sku: sku.trim().toUpperCase()
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `SKU "${sku}" already exists on product "${existing.name}"`
      });
    }
  }

  // Create product with SKU
  const product = new Product({
    // ... existing fields
    sku: sku ? sku.trim().toUpperCase() : undefined
  });

  await product.save();
  res.json({ success: true });
});
```

### Pattern 3: Language-Aware Frontend Display

**What:** Display SKU in product modal with proper text direction (RTL for Hebrew)

**When to use:** Any UI element that needs to work with existing language switching

**Trade-offs:**
- ✅ Pro: Consistent UX with rest of app
- ✅ Pro: Reuses existing language infrastructure
- ⚠️ Con: SKU label needs translation (eng/heb)

**Example:**
```javascript
// frontend/js/Views/categoriesView.js - generatePreview()
const skuLabel = this.lang === 'eng' ? 'SKU:' : 'מק"ט:';
const skuDisplay = product.sku
  ? `<div class="item-sku">
       <span class="sku-label">${skuLabel}</span>
       <span class="sku-value">${product.sku}</span>
     </div>`
  : '';

const modalContent = `
  <div class="item-specs" dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}">
    <h2 class="item-title_modal">${title}</h2>
    ${skuDisplay}
    ${description ? `<div class="item-description_modal">...</div>` : ''}
    ...
  </div>
`;
```

## Data Flow

### Request Flow: Add Product with SKU

```
[Admin Form]
    │
    │ 1. User fills form: name, price, category, SKU
    │
    ▼
[Form Submit (fetch POST)]
    │
    │ 2. POST /addproduct with JSON body: { name, sku, ... }
    │
    ▼
[Backend Route Handler]
    │
    │ 3. Validate: sku uniqueness check (DB query)
    │ 4. If duplicate → return 400 error
    │
    ▼
[Mongoose Model]
    │
    │ 5. Create Product({ sku: "ABC123", ... })
    │ 6. Schema validation (trim, uppercase, unique index)
    │
    ▼
[MongoDB]
    │
    │ 7. Insert document with sku field
    │
    ▼
[Response to Admin]
    │
    │ 8. { success: true, id: 123 }
```

### Request Flow: Edit Product SKU

```
[Admin Edit Form]
    │
    │ 1. Load existing product → pre-fill SKU input
    │
    ▼
[Form Submit (fetch POST)]
    │
    │ 2. POST /updateproduct with { id, sku, ... }
    │
    ▼
[Backend Route Handler]
    │
    │ 3. Find product by id
    │ 4. If SKU changed:
    │    - Check uniqueness (exclude current product)
    │    - If duplicate → return 400 error
    │
    ▼
[Mongoose Model]
    │
    │ 5. product.sku = newSku; await product.save()
    │
    ▼
[MongoDB]
    │
    │ 6. Update document
    │
    ▼
[Response to Admin]
    │
    │ 7. { success: true }
```

### Display Flow: Show SKU to Customer

```
[Frontend Categories Page]
    │
    │ 1. Fetch products: GET /productsByCategory
    │
    ▼
[Backend normalizeProductForClient()]
    │
    │ 2. Transform product: sku field passes through unchanged
    │    (no URL transformation needed like images)
    │
    ▼
[Frontend Model]
    │
    │ 3. Store products array in this.products
    │
    ▼
[User Clicks Product]
    │
    │ 4. generatePreview() → modal with SKU display
    │
    ▼
[Product Modal]
    │
    │ 5. Render: "SKU: ABC123" (or "מק״ט: ABC123" in Hebrew)
```

### Key Data Flows

1. **Add Flow:** Admin form → API validation → DB insert → success response
2. **Edit Flow:** Load existing → Admin form → API uniqueness check (exclude self) → DB update
3. **Display Flow:** API fetch → normalizeProductForClient (pass-through) → frontend render

## Integration with Existing Patterns

### Language Switching Integration

**Existing pattern:** `categoriesView.js` has `this.lang` property and methods `changeToEng()` / `changeToHeb()` that update all text on page.

**SKU integration:**
- Add SKU label to language-specific text updates
- Use existing `dir="${this.lang === 'heb' ? 'rtl' : 'ltr'}"` pattern
- SKU value itself should remain in English/numbers (not translated)

**Code location to modify:**
- `frontend/js/Views/categoriesView.js:843-856` (item-specs section in generatePreview)
- Add SKU between title and description

### normalizeProductForClient Integration

**Existing pattern:** Backend transforms product before sending to frontend:
- Converts relative image URLs → absolute URLs
- Omits internal fields (imageLocal, desktopLocal, etc.)
- Validates image files exist

**SKU integration:**
- ✅ **NO CHANGES NEEDED** to normalizeProductForClient()
- SKU is a simple string field → passes through as-is
- No URL transformation required
- No file validation required

**Why this works:**
```javascript
// backend/index.js:347-460
function normalizeProductForClient(productDoc) {
  const obj = productDoc.toObject();

  // Transform image URLs (existing logic)
  obj.image = toAbsoluteApiUrl(obj.image);
  obj.mainImage.desktop = toAbsoluteApiUrl(obj.mainImage.desktop);
  // ... more image transformations

  // SKU field: no transformation needed, copies through from obj
  // obj.sku is already a string, ready to send to client

  return obj;  // sku included automatically
}
```

### Admin Form Pattern (Inferred)

**Current pattern (based on backend code):**
- Admin forms likely submit via `fetch()` with JSON body
- Backend routes: `/addproduct`, `/updateproduct/:id`
- Authentication: `fetchUser` + `requireAdmin` middleware

**SKU integration:**
```html
<!-- Add to admin form (structure inferred) -->
<form id="add-product-form">
  <input name="name" required>
  <input name="category" required>
  <input name="sku" placeholder="Optional SKU (e.g., ABC-123)">
  <!-- ... existing fields -->
  <button type="submit">Add Product</button>
</form>

<script>
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    name: form.name.value,
    sku: form.sku.value.trim() || undefined,  // Send undefined if empty
    // ... other fields
  };

  const response = await fetch('/addproduct', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': localStorage.getItem('auth-token')
    },
    body: JSON.stringify(formData)
  });

  const result = await response.json();
  if (!result.success) {
    alert(result.error);  // Show "SKU already exists" message
  }
});
</script>
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1000 products | Current approach sufficient. Sparse unique index handles lookups efficiently. |
| 1000-10k products | No changes needed. Mongoose unique index on SKU provides O(log n) lookups. |
| 10k+ products | Consider: (1) Dedicated SKU validation endpoint for admin autocomplete, (2) Cache frequently accessed SKUs in Redis if lookup latency becomes issue. Not needed at current scale. |

### Scaling Priorities

1. **First bottleneck:** None expected. SKU is a simple indexed field, no complex queries.
2. **Second bottleneck:** If admin needs to validate SKU in real-time (while typing), add debounced validation endpoint. Current "validate on submit" is fine for now.

## Anti-Patterns

### Anti-Pattern 1: Storing SKU in Multiple Places

**What people do:** Add SKU to both Product model AND a separate SKU lookup table

**Why it's wrong:**
- Duplication introduces sync issues
- Mongoose unique index already provides fast lookups
- Increases complexity with no benefit at current scale

**Do this instead:** Single `sku` field on Product model with unique sparse index

### Anti-Pattern 2: Complex SKU Generation Logic

**What people do:** Auto-generate SKUs with complex rules (category prefix + counter + checksum)

**Why it's wrong:**
- Over-engineering for a field marked "optional" in requirements
- Makes SKU migration harder (old products have no SKU)
- Admin may already have external SKU system to match

**Do this instead:**
- Let admin enter SKU manually (or leave blank)
- Validate format if needed (e.g., max length, alphanumeric only)
- Keep it simple: `sku: { type: String, unique: true, sparse: true }`

### Anti-Pattern 3: Breaking Existing Products

**What people do:** Add `sku: { type: String, required: true }` → breaks all existing products without SKU

**Why it's wrong:**
- Requires immediate data migration for all products
- Blocks admin from adding new products until all old ones updated
- Violates "optional for new, migrate old later" requirement

**Do this instead:**
- Use `sparse: true` index (allows null/undefined)
- Make field optional at schema level
- Plan separate migration task for backfilling old products

## Component Boundaries and Build Order

### Suggested Build Order

**Phase 1: Database Foundation**
1. Add `sku` field to `backend/models/Product.js`
2. Test: Manually create product with SKU via MongoDB shell
3. Verify: Unique constraint works (try duplicate SKU)

**Phase 2: Backend API**
1. Modify `POST /addproduct` to accept `req.body.sku`
2. Add uniqueness validation (query existing SKU)
3. Modify `POST /updateproduct` to accept `req.body.sku`
4. Add edit-specific validation (exclude current product from uniqueness check)
5. Test: API accepts/rejects SKU correctly via Postman/curl

**Phase 3: Admin Forms**
1. Locate admin add/edit forms (find HTML files)
2. Add `<input name="sku">` to add form
3. Add `<input name="sku" value="{{existing}}">` to edit form
4. Update form submit handlers to include SKU in JSON body
5. Test: Submit form, verify SKU saved in DB

**Phase 4: Frontend Display**
1. Modify `categoriesView.js:generatePreview()`
2. Add SKU display between title and description
3. Add language labels (SKU: / מק"ט:)
4. Style with CSS (match existing modal design)
5. Test: Open modal, verify SKU shows (or hidden if null)

**Rationale for this order:**
- Database schema MUST exist before API can reference it
- API MUST work before forms can save data
- Forms MUST work before display has data to show
- Display is last because it's cosmetic (product functions without it)

### Dependency Graph

```
Product Schema (sku field)
    ↓
    ├─→ POST /addproduct (validation)
    │       ↓
    │       └─→ Admin Add Form
    │
    └─→ POST /updateproduct (validation)
            ↓
            └─→ Admin Edit Form
                    ↓
                    └─→ normalizeProductForClient (pass-through)
                            ↓
                            └─→ Frontend Display (modal)
```

**Critical path:** Schema → API → Forms (Display can be added anytime after API works)

## Testing Integration Points

### Backend Tests Needed

1. **Schema validation:**
   - Product with valid SKU saves correctly
   - Duplicate SKU rejected by unique index
   - Null/undefined SKU allowed (sparse index)
   - SKU trimmed and uppercased

2. **API endpoint validation:**
   - POST /addproduct with unique SKU → 200 success
   - POST /addproduct with duplicate SKU → 400 error + message
   - POST /updateproduct (no SKU change) → 200 success
   - POST /updateproduct (SKU change to duplicate) → 400 error
   - POST /updateproduct (SKU change to unique) → 200 success

### Frontend Tests Needed

1. **Admin form validation:**
   - Submit with valid SKU → success message
   - Submit with duplicate SKU → error alert displayed
   - Submit with empty SKU → product created (SKU null)
   - Edit form pre-fills existing SKU

2. **Display validation:**
   - Product with SKU → modal shows "SKU: ABC123"
   - Product without SKU → no SKU line in modal
   - Language switch → label changes (SKU: ↔ מק"ט:)
   - SKU value stays English even in Hebrew mode

## File Modification Checklist

### Files to Modify

| File Path | Change Type | Estimated LOC |
|-----------|-------------|---------------|
| `backend/models/Product.js` | ADD field | +5 lines |
| `backend/index.js` (POST /addproduct) | ADD validation | +15 lines |
| `backend/index.js` (POST /updateproduct) | ADD validation | +20 lines |
| `frontend/admin/[add-form].html` | ADD input | +3 lines |
| `frontend/admin/[edit-form].html` | ADD input | +3 lines |
| `frontend/js/Views/categoriesView.js` | ADD display | +10 lines |
| `frontend/css/[modal-styles].css` | ADD styling | +15 lines |

### Files NOT to Modify

| File Path | Reason |
|-----------|--------|
| `backend/index.js:normalizeProductForClient()` | SKU is simple string, passes through unchanged |
| `frontend/js/model.js` | No cart-related SKU logic needed |
| `frontend/js/View.js` | Base View has no product-specific logic |
| `backend/services/exchangeRateService.js` | SKU unrelated to currency |

## Edge Cases to Handle

1. **Case sensitivity:** "ABC123" vs "abc123" → Normalize to uppercase in schema
2. **Whitespace:** "  ABC  " → Trim in schema and validation
3. **Empty string vs null:** "" should convert to undefined (Mongoose doesn't index "")
4. **Edit without changing SKU:** Don't run uniqueness check (wasteful query)
5. **Concurrent add with same SKU:** Mongoose unique index prevents race condition
6. **Migration:** Old products have `sku: undefined` → sparse index allows this

## Sources

- Codebase analysis (HIGH confidence):
  - `backend/models/Product.js` - Product schema structure
  - `backend/index.js` - API routes, normalizeProductForClient pattern
  - `frontend/js/Views/categoriesView.js` - Display logic, language switching
  - `frontend/js/model.js` - Cart state, no SKU interaction needed

- Mongoose documentation (HIGH confidence):
  - Unique sparse indexes for optional unique fields
  - Schema validation (trim, uppercase transforms)

---
*Architecture research for: SKU management integration*
*Researched: 2026-02-01*
