# Phase 39: Header Utilities Layout - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 3 (all MODIFY — no new files)
**Analogs found:** 4 / 5 sub-patterns (custom-chevron is greenfield)

## File Classification

This phase modifies existing files only. "Role" here = the kind of edit; "Data flow" = N/A (static SSR chrome + CSS). Analogs are the *closest existing rule in the same codebase* the planner should copy the convention from.

| Modified File | Role | Edit Kind | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `frontend/css/homepage.css` (flags) | stylesheet | restyle states (opacity) | self — existing `.flag-icon` rules (438–453) | exact (in-file) |
| `frontend/css/homepage.css` (currency select) | stylesheet | restyle + custom chevron | self — `.tk-nav__currency-select` (456–473) for base; **no chevron analog** | partial / greenfield |
| `frontend/css/homepage.css` (cart badge RTL) | stylesheet | flip badge side | self — `.tk-nav__count` (136–147) | exact (in-file) |
| `frontend/css/homepage.css` (RTL header rules) | stylesheet | new `[dir="rtl"]` block | `frontend/css/about-800plus.css` (59), `about-devices.css` (277) + `tokens.css` (108) | role-match |
| `backend/views/partials/header.ejs` (currency options) | EJS partial | copy text change | self — existing `<option>` markup (44–48) | exact (in-file) |

**Note:** `homepage.css` currently has **ZERO** `[dir="rtl"]` rules (Grep confirmed: no matches for `dir=rtl` or `row-reverse` in the file). The RTL header rules are greenfield *for this file*, but the project-wide RTL convention is established in `about-*.css` and `tokens.css` — match that convention.

---

## Pattern Assignments

### 1. `frontend/css/homepage.css` — Flag active treatment (remove gold ring)

**Analog:** self, `frontend/css/homepage.css` lines 437–453 (current rules).

**Current `.flag-icon` / `.selected` rules (lines 437–453) — the gold ring to remove:**
```css
/* Language flags */
.tk-lang { display: flex; align-items: center; gap: 0.5rem; }
.flag-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--tk-radius-round);
  overflow: hidden;
  cursor: pointer;
  opacity: 0.5;
  flex: 0 0 auto;
  transition: opacity var(--tk-dur) var(--tk-ease),
    box-shadow var(--tk-dur) var(--tk-ease);
}
.flag-icon svg { width: 100%; height: 100%; object-fit: cover; }
.flag-icon:hover { opacity: 0.85; }
.flag-icon.selected { opacity: 1; box-shadow: 0 0 0 2px var(--tk-gold); }
.tk-nav--transparent .flag-icon.selected { box-shadow: 0 0 0 2px #fff; }
```

**What changes (per UI-SPEC §1 + D-03):**
- Inactive default `opacity: 0.5` → `opacity: 0.4` (UI-SPEC inactive value).
- `.flag-icon:hover` `opacity: 0.85` — **keep as-is** (already correct).
- `.flag-icon.selected` → drop `box-shadow: 0 0 0 2px var(--tk-gold)`, keep `opacity: 1`.
- Delete the `.tk-nav--transparent .flag-icon.selected { box-shadow: 0 0 0 2px #fff; }` rule entirely.
- Simplify the `transition` to drop the now-unused `box-shadow` segment → `transition: opacity var(--tk-dur) var(--tk-ease);`

**Opacity/transition convention to mirror (already used in this file):** see `.tk-nav__link` (lines 108–113) — `opacity: 0.85` default, `opacity: 1` on `:hover`/`.is-active`, with `transition: ... opacity var(--tk-dur) var(--tk-ease)`. The flag treatment matches this established opacity-only affordance convention.

---

### 2. `frontend/css/homepage.css` — Currency select restyle + custom chevron

**Analog (base rule):** self, lines 455–473 (current `.tk-nav__currency-select`).
**Analog (custom chevron):** NONE — see "No Analog Found" below. Greenfield; build per UI-SPEC §2.

**Current rule (lines 455–473):**
```css
/* Currency selector */
.tk-nav__currency-select {
  font-family: var(--tk-font-body);
  font-size: var(--tk-size-label);
  letter-spacing: var(--tk-track-body);
  text-transform: uppercase;
  background: transparent;
  border: 1px solid var(--tk-border-strong);
  border-radius: var(--tk-radius-xs);
  padding: 4px 6px;
  cursor: pointer;
  color: var(--tk-text-muted);
}
.tk-nav--transparent .tk-nav__currency-select {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.6);
}
/* Dropdown options render on a white menu, so keep their text dark. */
.tk-nav__currency-select option { color: var(--tk-text); }
```

**What changes (per UI-SPEC §2):**
- Add `appearance: none; -webkit-appearance: none;` (only existing `appearance: none` in codebase is on contact-form text inputs at `contact-me-devices.css:136-137,193-194` — those are NOT chevron selects, so there is no chevron pattern to copy; the data-URI chevron is net-new).
- Change `padding: 4px 6px` → `padding: 4px 24px 4px 8px` (LTR: right side widened to clear chevron).
- Add `background-image: url("data:image/svg+xml,...chevron-down...")`, `background-repeat: no-repeat`, `background-position: right 6px center`, `background-size: 12px 12px`.
- Chevron stroke color: `--tk-text-muted` (#666666) for solid; `#ffffff` for the `.tk-nav--transparent` variant (supply a second `background-image` under the transparent selector, since data-URI fill can't read a CSS var).
- Keep all other declarations (border, radius, font, letter-spacing, uppercase, transparent-variant color/border-color, `option { color }`) verbatim.

**Dead code to remove (lines 117–123 + variants 122–123):**
```css
.tk-nav__currency {
  font-size: var(--tk-size-label);
  letter-spacing: var(--tk-track-body);
  text-transform: uppercase;
}
.tk-nav--transparent .tk-nav__currency { color: #fff; }
.tk-nav--solid .tk-nav__currency { color: var(--tk-text-muted); }
```
Markup uses `.tk-nav__currency-select`, never `.tk-nav__currency` — safe to delete all three rules (confirmed: no `.tk-nav__currency` class without `-select` suffix in header.ejs line 44).

---

### 3. `frontend/css/homepage.css` — Cart count badge (RTL side flip)

**Analog:** self, lines 125–147 (current `.tk-nav__cart` / `.tk-nav__count`).

**Current badge positioning rule (lines 136–147) — the `right: -8px` to flip:**
```css
.tk-nav__count {
  position: absolute;
  top: -6px; right: -8px;
  min-width: 18px; height: 18px;
  padding: 0 4px;
  border-radius: var(--tk-radius-round);
  font-size: 0.62rem;
  font-weight: var(--tk-weight-semibold);
  display: flex; align-items: center; justify-content: center;
}
.tk-nav--transparent .tk-nav__count { background: rgba(255,255,255,0.95); color: var(--tk-ink); }
.tk-nav--solid .tk-nav__count { background: var(--tk-ink); color: #fff; }
```

**What changes (per UI-SPEC §3 + D-10):** Leave the LTR rule untouched. Add RTL override (see Shared RTL pattern below):
```css
[dir="rtl"] .tk-nav__count { right: auto; left: -8px; }
```

---

### 4. `backend/views/partials/header.ejs` — Currency option text

**Analog:** self, lines 44–48 (current `<select>` markup).

**Current markup (lines 44–48) — confirms exact current text vs target:**
```html
<select name="currency" id="currency-desktop" class="header-currency-selector tk-nav__currency-select" aria-label="Currency"<% if (!_eng) { %> dir="rtl"<% } %>>
  <option value="default" class="currency-option"><% if (_eng) { %>Currency<% } else { %>מטבע<% } %></option>
  <option value="usd" class="currency-option"><% if (_eng) { %>USD<% } else { %>דולר<% } %></option>
  <option value="ils" class="currency-option"><% if (_eng) { %>ILS<% } else { %>שקל<% } %></option>
</select>
```

**What changes (per UI-SPEC §Copywriting + D-07):**
- USD option: `USD` (EN) / `דולר` (HE) → **`$ USD` for BOTH languages** (drop the EN/HE conditional for this option).
- ILS option: `ILS` (EN) / `שקל` (HE) → **`₪ ILS` for BOTH languages** (drop the conditional).
- Default option `Currency` / `מטבע` — **keep the existing bilingual conditional unchanged**.
- Do NOT change `value="usd"`/`value="ils"`/`value="default"` (Phase 40 reads these) and do NOT remove `class="currency-option"`, `dir="rtl"` conditional, or `id="currency-desktop"` / `.header-currency-selector` (JS hooks per CONTEXT §code_context).

Target option markup:
```html
<option value="usd" class="currency-option">$ USD</option>
<option value="ils" class="currency-option">₪ ILS</option>
```

**Accessibility (UI-SPEC §1):** Confirm/add on each flag in `header.ejs` lines 23 & 30 — they already have `aria-label="English"` / `aria-label="עברית"` and `role="button" tabindex="0"`. Per spec, ADD matching `title` attribute and `aria-current="true"` on the `.selected` flag (currently absent). Do not remove existing `data-lang`, `flag-icon`, `flag-eng`/`flag-heb` classes (JS click hooks).

---

## Shared Patterns

### RTL header rules (greenfield in homepage.css — copy convention from project)

**Source convention:** `frontend/css/about-800plus.css:59`, `about-devices.css:277` and `frontend/css/tokens.css:108-112`.

**How RTL is expressed elsewhere in this project:**
```css
/* tokens.css lines 107-112 — attribute selector, single-quoted, remaps font vars */
[dir='rtl'] {
  --tk-font-display: var(--tk-font-hebrew);
  --tk-font-body: var(--tk-font-hebrew);
  --tk-font-serif: var(--tk-font-hebrew);
}

/* about-800plus.css line 59 — html-prefixed, descendant selector override */
html[dir='rtl'] #page-title::after {
  margin: 0.75rem auto 2.5rem;
}
```

**Convention notes for the planner:**
- The project uses the **attribute selector `[dir="rtl"]`** (sometimes `html[dir='rtl']`), NOT a `.heb` lang class. `dir` is set server-side by EJS (header.ejs already emits `dir="rtl"` on the select for `/he`; the page `<html dir>` is set by the layout for Hebrew routes).
- `tokens.css` already auto-remaps the font to Rubik inside any `[dir='rtl']` subtree — the new header RTL rules inherit this for free; do NOT re-declare fonts.
- Single vs double quotes: existing files use single quotes (`[dir='rtl']`). UI-SPEC examples use double quotes (`[dir="rtl"]`). Both are valid CSS; prefer matching the surrounding file — but homepage.css has none yet, so either is fine. Pick one and be consistent.

**Apply to:** the three RTL rules from UI-SPEC §RTL Layout Contract (place together as a labeled RTL block in homepage.css):
```css
/* RTL header mirror (Hebrew /he) */
[dir="rtl"] .tk-nav            { flex-direction: row-reverse; }
[dir="rtl"] .tk-nav__utils     { flex-direction: row-reverse; }
[dir="rtl"] .tk-nav__count     { right: auto; left: -8px; }
[dir="rtl"] .tk-nav__currency-select {
  background-position: left 6px center;
  padding: 4px 8px 4px 24px;
}
```

### Transparent-vs-solid variant pairing (keep both in sync)

**Source:** established throughout homepage.css — every header element has paired `.tk-nav--transparent <el>` and `.tk-nav--solid <el>` (or default) rules: see `.tk-nav__link` (111–112), `.tk-nav__cart svg` (134–135), `.tk-nav__count` (146–147), `.tk-nav__currency-select` (468–471).

**Apply to:** flags, currency select (incl. its chevron `background-image` color), and cart — every visual change must supply BOTH the solid (default) and `.tk-nav--transparent` variant. Per UI-SPEC §Color, the transparent variant uses `#ffffff` text/stroke/chevron and `rgba(255,255,255,0.6)` borders.

### `--tk-*` tokens referenced by this phase (from tokens.css)

| Token | Value | UI-SPEC usage |
|-------|-------|---------------|
| `--tk-gold` | `#c5a572` | Currently on selected-flag ring — **being removed** (line 14) |
| `--tk-ink` | `#1f2937` | Cart badge bg (solid) / badge text (transparent) (line 20) |
| `--tk-text` | `#333333` | Cart SVG stroke (solid); currency `option` text (line 25) |
| `--tk-text-muted` | `#666666` | Currency select text + chevron (solid) (line 27) |
| `--tk-white` | `#ffffff` | Solid nav bg / option menu bg (line 31) |
| `--tk-border-strong` | `#d8d8d2` | Currency select border (solid) (line 38) |
| `--tk-font-body` | `Montserrat…` (→ Rubik via RTL remap) | Currency select font (line 51) |
| `--tk-font-hebrew` | `Rubik…` | Auto-applied in RTL (line 53) |
| `--tk-weight-semibold` | `600` | Cart badge number weight (line 60) |
| `--tk-size-label` | `0.75rem` | Currency select font-size (line 66) |
| `--tk-track-body` | `0.04em` | Currency select letter-spacing (line 71) |
| `--tk-radius-xs` | `4px` | Currency select border-radius (line 83) |
| `--tk-radius-round` | `50%` | Flag + cart badge radius (line 86) |
| `--tk-dur` | `0.3s` | Flag opacity transition (line 99) |
| `--tk-ease` | `cubic-bezier(0.4,0,0.2,1)` | Flag transition easing (line 97) |

All values above are exactly what UI-SPEC's color/typography/spacing tables reference — use the token, not the hardcoded hex (CONTEXT §code_context: "style with these, not hardcoded values").

---

## No Analog Found

| Pattern | Reason | Planner guidance |
|---------|--------|------------------|
| Custom `<select>` chevron via `background-image` data-URI | No styled native select with a custom chevron exists anywhere in the codebase. The only `appearance: none` rules (`contact-me-devices.css:136-137, 193-194`) are on plain text `<input>`/`<button>` elements with no chevron. | Build net-new per UI-SPEC §2: inline SVG chevron-down as a URL-encoded data URI, `background-size: 12px 12px`, `background-position: right 6px center` (LTR) / `left 6px center` (RTL). Supply separate solid (#666666) and transparent (#ffffff) `background-image` values since data-URI stroke color can't read a CSS var. |
| Header RTL layout rules in `homepage.css` | `homepage.css` has zero `[dir="rtl"]` / `row-reverse` rules (Grep confirmed). | Not truly new to the *project* — copy the `[dir='rtl']` attribute-selector convention from `tokens.css:108` and `about-800plus.css:59` (see Shared RTL pattern). Mechanism per UI-SPEC: `flex-direction: row-reverse` on `.tk-nav` + `.tk-nav__utils`. |

---

## Metadata

**Analog search scope:** `frontend/css/**` (homepage.css, tokens.css, about-*.css, contact-me-*.css), `backend/views/partials/header.ejs`
**Files scanned:** homepage.css (header sections 75–234, 430–473), tokens.css (full, 113 lines), header.ejs (full, 57 lines); cross-CSS Grep for `appearance: none`, `[dir="rtl"]`, `row-reverse`
**Pattern extraction date:** 2026-06-24

## PATTERN MAPPING COMPLETE

**Phase:** 39 - header-utilities-layout
**Files classified:** 3 (homepage.css, header.ejs, tokens.css read-only reference)
**Analogs found:** 4 in-codebase / 1 greenfield (custom chevron)

### Coverage
- Sub-patterns with exact in-file analog: 3 (flags, cart badge, currency option text)
- Sub-patterns with project-convention analog: 1 (RTL rules — from tokens.css + about-*.css)
- Sub-patterns with no analog: 1 (custom select chevron)

### Key Patterns Identified
- All header elements come in paired `.tk-nav--transparent` / `.tk-nav--solid` variants — every change must touch both.
- Project-wide RTL convention is the attribute selector `[dir='rtl']` (font auto-remapped in tokens.css), NOT a `.heb` class; `homepage.css` is the first header file to add such rules.
- Opacity-only state affordance is already established (`.tk-nav__link`: 0.85 → 1) — the new flag treatment matches it exactly, justifying removal of the gold `box-shadow` ring.
- Tokens are mandatory: gold/ink/text-muted/border-strong/radii/font-body/size-label/track-body all exist in tokens.css with the exact values UI-SPEC references.

### File Created
`C:\Development\Online\.planning\phases\39-header-utilities-layout\39-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can reference exact line numbers and verbatim excerpts for each modification.
