# Phase 39: Header Utilities Layout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-23
**Phase:** 39-header-utilities-layout
**Areas discussed:** Flag pill design, Utilities order (LTR), Currency dropdown style, RTL mirroring

---

## Flag pill design

### Pill shape
| Option | Description | Selected |
|--------|-------------|----------|
| Both flags in one capsule | Single pill-shaped container holding both round flag icons | |
| Segmented toggle pill | One capsule split into two halves, active half filled | |
| Keep two separate icons | Two round icons, refine spacing/sizing | ✓ |

### Flag artwork
| Option | Description | Selected |
|--------|-------------|----------|
| Keep SVG flags | Inline US + IL SVGs, crisp and consistent | ✓ |
| Use emoji | 🇺🇸 🇮🇱 emoji, matches prototype | |

### Active state
| Option | Description | Selected |
|--------|-------------|----------|
| Full color active / dimmed inactive | Active full opacity, inactive ~0.4 grayscale | ✓ |
| Gold ring on active | Existing 2px gold ring treatment | |
| Filled gold background half | Solid gold fill (segmented only) | |

### Pill vs icons (criterion conflict)
| Option | Description | Selected |
|--------|-------------|----------|
| Amend criterion — two icons is final | Update ROADMAP/HEADER-01 to two refined icons | ✓ |
| Wrap the two icons in a subtle pill | Two icons inside one bordered container | |
| Reconsider — go with the pill | Revert to single-pill design | |

**User's choice:** Two separate SVG icons, full-color active / dimmed inactive; amend ROADMAP criterion 1 / HEADER-01.
**Notes:** Explicitly accepted that the "single rounded pill" wording in the milestone/roadmap will be amended — two icons is the final design.

---

## Utilities order (LTR)

### LTR order
| Option | Description | Selected |
|--------|-------------|----------|
| Currency → Flags → Cart | Prototype code.html order, cart far right | |
| Flags → Currency → Cart | Current DOM order, cart far right | ✓ |
| Cart → Currency → Flags | Literal ROADMAP criterion 3, cart left | |

### Nav/logo placement
| Option | Description | Selected |
|--------|-------------|----------|
| Logo left, nav center, utils right | Keep current frame, only change utils internals | ✓ |
| Revisit logo/nav placement too | Adjust logo/nav (overlaps Phase 42) | |

**User's choice:** Flags → Currency → Cart (cart far right); logo/nav frame unchanged.
**Notes:** Matches current DOM — no markup reorder needed. Criterion 3 wording to be amended.

---

## Currency dropdown style

### Build approach
| Option | Description | Selected |
|--------|-------------|----------|
| Styled native <select> | Restyle native select to .tk-* look | ✓ |
| Custom button + menu dropdown | Build custom dropdown, more JS/a11y | |

### Labels
| Option | Description | Selected |
|--------|-------------|----------|
| Keep current: Currency / USD / ILS | Placeholder + codes | |
| Currency codes only (USD / ILS) | Drop placeholder | |
| Symbols + codes ($ USD / ₪ ILS) | Symbol alongside code | ✓ |

**User's choice:** Styled native `<select>`; options show `$ USD` / `₪ ILS`.
**Notes:** Keeping native select keeps Phase 40 `currency-changed` wiring trivial. Default-to-active-currency deferred to Phase 40.

---

## RTL mirroring

### RTL behavior
| Option | Description | Selected |
|--------|-------------|----------|
| True mirror | Logo right, utils left, internal order reverses (cart left, flags right) | ✓ |
| Keep flags-left / cart-right | Literal criterion 4, no internal reverse | |
| Don't reorder, just move cluster | Move cluster, keep LTR internal order | |

### RTL details (multi-select)
| Option | Description | Selected |
|--------|-------------|----------|
| Cart count badge side | Flip badge from right:-8px to left:-8px | ✓ |
| Currency dropdown chevron/text | Chevron + option text follow dir=rtl | ✓ |
| Spacing/gaps stay symmetric | Keep 1.4rem gaps, no per-side margins | ✓ |

**User's choice:** True mirror — cart(left) → currency → flags(right); flip badge side, currency chevron/text follows RTL, symmetric gaps.
**Notes:** Criterion 4's "flag pill at the left, cart at the right" contradicts a true mirror of the locked LTR order — criterion 4 to be amended (cart left, flags right; drop "pill").

---

## Claude's Discretion

- Exact RTL implementation mechanism (`[dir="rtl"]`, `flex-direction: row-reverse`, logical properties, or lang class) — `homepage.css` has no RTL rules yet, greenfield.
- Inactive-flag opacity/desaturation values, custom chevron asset, precise sizing/token usage.

## Deferred Ideas

- Currency change behavior + persistence → Phase 40 (CURR); note pre-existing `this._render()` bug in `currency-changed` handler.
- Footer social links → Phase 41 (FOOT).
- Mobile hamburger nav + mobile access to flags/currency → Phase 42 (NAV).
- ROADMAP/REQUIREMENTS criterion amendments (criteria 1, 3, 4 + HEADER-01) to match locked decisions.
