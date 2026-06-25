# Phase 41: Footer Social Restore - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 3 (all modified, 0 created)
**Analogs found:** 3 / 3 (every change copies from an in-file or sibling analog)

> This phase is a **same-file extension / deletion** job, not new-file creation.
> Every "analog" is either an existing block in the *same* file being edited or a
> directly adjacent sibling rule. The planner should copy structure verbatim and
> only swap text/values — no novel patterns are introduced.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `backend/views/partials/footer.ejs` | view (EJS partial) | transform (render) | the 3 existing `.tk-footer__col` blocks in the **same file** (L8-24) | exact (in-file) |
| `frontend/css/homepage.css` | config (stylesheet) | transform (render) | the `.tk-footer*` rule group in the **same file** (L341-348) + mobile rule (L411-419) | exact (in-file) |
| `frontend/js/View.js` | view (base class) | request-response | N/A — deletion only; SVG source is `setFooterLng()` L1116-1127 / L1178-1189 | exact (port-then-delete) |

---

## Pattern Assignments

### `backend/views/partials/footer.ejs` (view, transform) — ADD 4th column

**Analog:** the existing 3 columns in the same file. Copy a `.tk-footer__col` block
verbatim, then swap the heading text and replace the `<a class="tk-footer__link">`
links with two social `<a>` elements carrying the ported SVGs.

**Bilingual + heading pattern to mirror** (footer.ejs L1-9, 20-21):
```ejs
<%
  var _eng = lang === 'eng';
%>
...
<div class="tk-footer__col">
  <span class="tk-footer__heading"><% if (_eng) { %>Info<% } else { %>מידע<% } %></span>
```
New heading copy (from D-03): `<% if (_eng) { %>Follow Me<% } else { %>עקבו אחרי<% } %>`

**SVG markup to port** — Instagram (outline) + Facebook (solid). Identical in both
the EN and HE branches of `View.js` `setFooterLng()`, so it is language-neutral and
goes in once. Source = View.js L1116-1127:
```html
<a class="tk-footer__social-link" href="https://www.instagram.com/tamar_kfir_jewelry/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
</a>
<a class="tk-footer__social-link" href="https://www.facebook.com/tamarkfirjewelry" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path>
  </svg>
</a>
```
Notes for planner:
- The legacy class names were `footer-social-link` / `footer-social-section` /
  `footer-social-title`. Rename to the `tk-footer__*` BEM namespace (e.g.
  `tk-footer__social`, `tk-footer__social-link`) to match the surrounding partial.
- The legacy URLs and `aria-label`s are exactly the D-06/D-07 links — copy as-is.
- The heading uses the existing `.tk-footer__heading` class, NOT the legacy
  `.footer-social-title`.
- Place the new `<div class="tk-footer__col">` as the **4th** child of
  `.tk-footer__cols` (after the `Info` column at L20-24, before the closing
  `</div>` at L25). Do NOT put it in `.tk-footer__bar` (D-01).

---

### `frontend/css/homepage.css` (config, transform) — 3→4 col grid + social styles

**Analog 1 — grid column count** (homepage.css L343):
```css
.tk-footer__cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4rem; max-width: 760px; margin: 0 auto; padding: 4rem 2rem 3.5rem; }
```
Change `repeat(3, 1fr)` → `repeat(4, 1fr)` (D-01). Watch `max-width: 760px` + `gap: 4rem`
— four columns at 760px with 4rem gaps is tight; planner may reduce the gap or raise
the max-width to keep columns readable (D-02 calls this out explicitly).

**Analog 2 — link/hover token treatment to mirror for icons** (homepage.css L346-347):
```css
.tk-footer__link { font-size: 0.8rem; letter-spacing: var(--tk-track-body); text-transform: uppercase; text-decoration: none; color: var(--tk-text-muted); line-height: 1.8; margin-bottom: 0.6rem; transition: color var(--tk-dur) var(--tk-ease); }
.tk-footer__link:hover { color: var(--tk-text); }
```
New social rules must reuse the **same muted→text hover idiom** (D-05 "bare muted icons"):
```css
.tk-footer__social { display: flex; gap: <token-ish>; }            /* row of icons under heading */
.tk-footer__social-link { color: var(--tk-text-muted); transition: color var(--tk-dur) var(--tk-ease); }
.tk-footer__social-link:hover { color: var(--tk-text); }
.tk-footer__social-link svg { width: 20px; height: 20px; }          /* understated, ~matches 0.8rem links */
```
The inline SVGs use `stroke="currentColor"` (Instagram) and `fill="currentColor"`
(Facebook), so setting `color` on the link drives both — no extra fill/stroke rules
needed. Use `--tk-text-muted`, `--tk-text`, `--tk-dur`, `--tk-ease` only (D-04/D-05).

**Analog 3 — mobile reflow** (homepage.css L410-419). IMPORTANT: the breakpoint is
`max-width: 860px`, NOT 800px (CONTEXT.md says "<800px" loosely):
```css
@media (max-width: 860px) {
  ...
  .tk-footer__cols { gap: 2rem; }
}
```
This rule keeps the grid at 4 columns on mobile (it only changes gap). With a 4th
column added, the planner MUST extend this rule so four columns don't overflow at
`max-width: 760px` — e.g. `grid-template-columns: repeat(2, 1fr)` (2×2) or `1fr`
(stack). D-02 requires a sane reflow here.

---

### `frontend/js/View.js` (view) — RETIRE dead footer JS

**This is a deletion, not a pattern copy.** Port the SVGs (above) into footer.ejs
FIRST, then remove:

1. **Call site** (View.js L928):
```js
// Update footer and handle other elements
this.handleFooterMarkup(lng);
```
Delete the call (and its comment). Confirm nothing else in `setLngElements`/the
caller depends on its return.

2. **Method definitions** (View.js L1073-1206):
   - `setFooterLng(lng)` (L1073-1199) — the big EN/HE template-string footer.
   - `handleFooterMarkup(lng)` (L1201-1206):
```js
handleFooterMarkup(lng) {
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.innerHTML = this.setFooterLng(lng);
  }
}
```
Confirmed dead (D-08): it targets `.footer`, but SSR views only render `.tk-footer`,
so the `if (footer)` guard is always false. Removing it cannot regress rendering —
the footer is SSR-static after this phase, so no JS twin is needed and the
dual-render trap (CLAUDE.md §SSR + Client Dual-Render) does NOT apply.

Planner must grep for any **other** references to `setFooterLng` / `handleFooterMarkup`
before deleting (subclass overrides, etc.). Only the L928 call site is known so far.

---

## Shared Patterns

### Design tokens (apply to all CSS in this phase)
**Source:** `frontend/css/tokens.css` (`:root`, L12-105) + RTL remap (L107-112)
**Apply to:** all new `.tk-footer__social*` rules in homepage.css
Relevant tokens already used by the footer:
```css
--tk-white: #ffffff;        --tk-black: #000000;
--tk-border: #e5e5e5;
--tk-text: #333333;         --tk-text-muted: #666666;
--tk-size-label: 0.75rem;   --tk-size-caption: 0.7rem;
--tk-track-body: 0.04em;    --tk-track-label: 0.15em;  --tk-track-tight: 0.02em;
--tk-weight-semibold: 600;
--tk-dur: 0.3s;             --tk-ease: cubic-bezier(0.4, 0, 0.2, 1);
```
Never hard-code hex values for the new icons — D-04/D-05 lock the palette to
`--tk-text-muted` (rest) → `--tk-text` (hover).

### RTL handling (apply to footer.ejs + homepage.css)
**Source:** tokens.css L107-112 (`[dir='rtl']` font remap) + the existing
`.tk-footer__cols` CSS grid.
**Apply to:** the new 4th column.
The footer partial uses NO explicit `direction: rtl` (unlike the dead
`setFooterLng()` HE branch at View.js L1138 which set `style="direction: rtl;"`).
The CSS grid auto-reverses column order in an RTL subtree, so the new column needs
**no** RTL-specific override — but the planner must verify on `/he` that the 4th
column lands at the visual start and the icon row reads naturally (CONTEXT watch-out).
Do NOT copy the legacy `direction: rtl` inline style.

### Bilingual EJS idiom (apply to footer.ejs)
**Source:** footer.ejs L4 (`var _eng = lang === 'eng';`) + every column heading.
**Apply to:** the new "Follow Me" / "עקבו אחרי" heading only. The SVGs, URLs,
`aria-label`s, and `target/rel` are language-neutral and are emitted once (outside
any `if (_eng)` branch). `urlLang` is for internal hrefs only — the social links are
absolute external URLs and do NOT use it.

---

## No Analog Found

None. Every change in this phase extends or deletes existing, in-file code:

| File | Role | Data Flow | Status |
|------|------|-----------|--------|
| (none) | — | — | All 3 files have exact in-file/sibling analogs |

---

## Metadata

**Analog search scope:** `backend/views/partials/footer.ejs`, `frontend/css/homepage.css`
(footer + responsive sections), `frontend/css/tokens.css`, `frontend/js/View.js`
(L920-940, L1073-1206)
**Files scanned:** 4
**Key correction surfaced:** mobile breakpoint is `max-width: 860px` (homepage.css L411),
not the "<800px" stated loosely in CONTEXT.md.
**Pattern extraction date:** 2026-06-25
