---
phase: 39-header-utilities-layout
verified: 2026-06-24T00:00:00Z
status: human_needed
score: 10/10 must-haves verified (code-level); 4 visual confirmations pending
overrides_applied: 0
human_verification:
  - test: "Load /en home; inspect the header utilities cluster"
    expected: "Two separate round flag icons (US + IL). Active language flag is full color; inactive flag is visibly dimmed (~0.4). NO gold/white ring on the active flag. Order left-to-right: Flags -> Currency -> Cart, with even spacing."
    why_human: "Visual appearance and layout ordering cannot be confirmed by static grep — must be observed rendered."
  - test: "Inspect the currency dropdown on /en (solid nav) and home hero (transparent nav)"
    expected: "Native OS arrow is hidden; a single custom chevron shows on the right — dark (#666666) on solid nav, white (#ffffff) over the hero. Options read `$ USD` and `₪ ILS`."
    why_human: "Custom-chevron rendering and OS-arrow suppression are visual; cross-browser appearance varies."
  - test: "Load /he home and compare against /en"
    expected: "True RTL mirror: utils cluster sits at the LEFT edge, order Cart -> Currency -> Flags. Cart count badge sits on the LEFT of the cart icon. Currency chevron is on the LEFT. Nav links stay centered and the TK logo stays at the (right) edge. Currency options still read `$ USD` / `₪ ILS`."
    why_human: "RTL visual mirror, badge side, chevron side, and preserved centering require rendered inspection."
  - test: "After `npm run build` + backend restart, load /en and /he, open the currency dropdown and let the page settle"
    expected: "`$ USD` / `₪ ILS` labels persist with NO flash-revert to USD/ILS/דולר/שקל after View.js hydration runs."
    why_human: "View.js is Parcel-bundled; the label-persistence behavior only manifests in the browser after the (deferred) build + restart. Source change is verified correct."
---

# Phase 39: Header Utilities Layout Verification Report

**Phase Goal:** Header utilities cluster restyled to the approved `.tk-*` design — two refined flag icons (active full color / inactive dimmed ~0.4, no ring), styled currency dropdown (custom chevron, OS arrow hidden), cart icon + count in approved LTR order Flags → Currency → Cart with correct spacing; RTL-correct true mirror on `/he`.
**Verified:** 2026-06-24
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Two separate round flag icons; active full color (opacity 1), inactive dimmed (0.4), no ring (SC1/HEADER-01) | ✓ VERIFIED (code) | header.ejs:23,30 two distinct `.flag-icon` SVGs (US `flag-icons-us`, IL `flag-icons-il`); homepage.css:432-444 `.flag-icon{opacity:0.4;border-radius:round}`, `:hover{0.85}`, `.selected{opacity:1}`; zero `box-shadow: 0 0 0 2px` matches (gold + white rings removed) |
| 2 | Currency renders as styled dropdown, OS arrow hidden, custom chevron solid #666666 / transparent #ffffff (SC2/HEADER-02) | ✓ VERIFIED (code) | homepage.css:447-471 `appearance:none` + `-webkit-appearance:none`, `background-color:transparent`, solid `stroke='%23666666'` data-URI, transparent-variant `stroke='%23ffffff'` override, `background-position:right 6px center`, `background-size:12px 12px`, `padding:4px 24px 4px 8px` |
| 3 | LTR order Flags → Currency → Cart with correct spacing (SC3/HEADER-03) | ✓ VERIFIED (code) | header.ejs:21-56 DOM order inside `.tk-nav__utils` = `.tk-lang` (flags) → `select.tk-nav__currency-select` → `a.tk-nav__cart`; homepage.css:116 `.tk-nav__utils{display:flex;gap:1.4rem}` |
| 4 | RTL true mirror on /he: cart left, flags right, badge flips left, chevron flips left, centering preserved (SC4/HEADER-04) | ✓ VERIFIED (code) | homepage.css:473-480 `[dir="rtl"] .tk-nav{row-reverse}`, `.tk-nav__utils{row-reverse}`, `.tk-nav__count{right:auto;left:-8px}`, `.tk-nav__currency-select{background-position:left 6px center;padding:4px 8px 4px 24px}`; LTR `.tk-nav__count` retains `right:-8px`; no `[dir="rtl"] .tk-nav__links` rule (centering untouched) |
| 5 | Currency options read `$ USD` / `₪ ILS` on both /en and /he | ✓ VERIFIED | header.ejs:46-47 literal `$ USD` / `₪ ILS` (no language conditional); default option keeps bilingual `Currency`/`מטבע`; no `דולר`/`שקל` remain |
| 6 | Labels persist after View.js hydration (not reverted) | ✓ VERIFIED (source) | View.js:1053-1062 `updateCurrencySelectorText` sets `options[1].text='$ USD'`, `options[2].text='₪ ILS'` in BOTH eng and heb branches; options[0] + dir add/remove logic intact. Browser effect pending build (deferred). |
| 7 | Each flag has aria-label + title; active flag carries aria-current="true" | ✓ VERIFIED | header.ejs:23,30 `aria-label`+`title="English"`/`title="עברית"`; `aria-current="true"` gated per-language (exactly twice, behind `_eng`/`!_eng`) |
| 8 | hydratePrototypeChrome performs no destructive header innerHTML rewrite | ✓ VERIFIED | View.js:981-1016 only binds flag-click nav, calls `updateCurrencySelectorText`, `persistCartNumber`, `setPageSpecificLanguage`; zero `innerHTML` touching header/tk-nav/flag/currency anywhere in View.js |
| 9 | Dead `.tk-nav__currency` CSS block removed | ✓ VERIFIED | Zero matches for `.tk-nav__currency {` (bare, no `-select`); `.tk-nav__currency-select` rules intact |
| 10 | Doc-sync: ROADMAP/REQUIREMENTS amended to two-flag-icon design | ✓ VERIFIED | Zero `single rounded pill`/`flag pill` matches; ROADMAP SC1/3/4 + REQUIREMENTS HEADER-01/03 reworded; `two separate`/`two refined` present |

**Score:** 10/10 truths verified at code level. 4 visual outcomes require human browser confirmation (see below).

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `frontend/css/homepage.css` | Flag opacity states, currency chevron, RTL block, dead-block removal | ✓ VERIFIED | All Plan-01 acceptance patterns present (lines 116, 432-480); no ring box-shadows; raw-served (no build needed) |
| `backend/views/partials/header.ejs` | `$ USD`/`₪ ILS` labels, flag title + aria-current, JS hooks intact | ✓ VERIFIED | Lines 21-56; all `value=`/`id=`/`class=`/`data-lang` hooks preserved; DOM order Flags→Currency→Cart |
| `frontend/js/View.js` | Mirror labels in both branches, no header innerHTML rewrite | ✓ VERIFIED | Lines 1053-1062 mirror; hydratePrototypeChrome (981-1016) non-destructive; legacy `getCurrencySelectorMarkup` correctly untouched |
| `.planning/ROADMAP.md` | Amended SC 1/3/4 | ✓ VERIFIED | Lines 120-134 two-flag/Flags→Currency→Cart/RTL-true-mirror wording |
| `.planning/REQUIREMENTS.md` | Amended HEADER-01/03 | ✓ VERIFIED | Lines 12-14; traceability table HEADER-01..04 → Phase 39 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `[dir="rtl"] .tk-nav` rules | `html[dir='rtl']` set server-side on /he | attribute selector | ✓ WIRED | homepage.css uses `[dir="rtl"]`; project convention (tokens.css `[dir='rtl']`) confirms server sets `dir` on /he |
| header.ejs option text `$ USD`/`₪ ILS` | View.js updateCurrencySelectorText | dual-render mirror | ✓ WIRED | Both emit identical literals; hydration call site View.js:1002-1004 targets `select.header-currency-selector[name="currency"]` matching header.ejs:44 |
| flag `data-lang` | View.js click navigation | event binding | ✓ WIRED | View.js:984-998 binds `.flag-icon[data-lang]` → full-page lang navigation; hooks present in header.ejs |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| HEADER-01 | 39-01, 39-02, 39-03 | Two separate refined flag icons; active full color / inactive dimmed (no ring) | ✓ SATISFIED (code) | header.ejs two SVG flags; CSS opacity-only states; a11y attrs; doc-synced |
| HEADER-02 | 39-01, 39-02 | Currency renders as styled dropdown | ✓ SATISFIED (code) | appearance:none + custom chevron; `$ USD`/`₪ ILS` labels |
| HEADER-03 | 39-01, 39-03 | Utilities in order Flags → Currency → Cart + spacing | ✓ SATISFIED (code) | DOM order + flex gap; doc-synced |
| HEADER-04 | 39-01, 39-03 | RTL mirror on /he | ✓ SATISFIED (code) | `[dir="rtl"]` mirror block; badge + chevron flip; doc-synced |

No orphaned requirements — all four HEADER IDs are claimed by phase plans and mapped to Phase 39 in the traceability table.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | None | — | No TODO/FIXME/placeholder/stub patterns in modified files. Legacy `getCurrencySelectorMarkup` retains old USD/ILS labels but is the `.menu`-path (not prototype chrome) and was correctly left untouched per plan. |

### Behavioral Spot-Checks

Skipped — phase output is CSS/EJS/JS chrome whose outcomes are visual. No isolated runnable behavior to assert without a browser (routed to human verification). All six documented commits confirmed present (`a6f43ca`, `77e98a3`, `df13ae4`, `ef89ceb`, `cf100e2`, `d173848`).

### Human Verification Required

1. **LTR header (/en):** two flags (active full color, inactive dimmed, no ring); order Flags → Currency → Cart with even spacing.
2. **Currency dropdown:** OS arrow hidden, custom chevron visible (dark on solid nav, white over hero); options `$ USD` / `₪ ILS`.
3. **RTL header (/he):** true mirror — utils at left, order Cart → Currency → Flags; badge on left of cart; chevron on left; nav links centered, logo at edge.
4. **Post-build label persistence:** after `npm run build` + backend restart, `$ USD`/`₪ ILS` persist with no flash-revert after hydration.

### Gaps Summary

No code-level gaps. Every must-have from all three plans, all four ROADMAP success criteria, and all four HEADER requirements are verified against the actual files (not just SUMMARY claims). The CSS (raw-served) and EJS changes take effect on reload; the View.js label-mirror change is correct in source but only manifests in the browser after the known-deferred `npm run build` + backend restart — this is an expected deploy step, not a verification gap. The four pending items are inherently visual/runtime outcomes that cannot be confirmed by static inspection, hence status `human_needed`.

---

_Verified: 2026-06-24_
_Verifier: Claude (gsd-verifier)_
