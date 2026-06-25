# Phase 41: Footer Social Restore - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 41-footer-social-restore
**Areas discussed:** Placement, Icon visual style, Section label, Legacy footer JS

---

## Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Centered row above black bar | Dedicated full-width social row between the 3-col grid and the black copyright bar | |
| 4th grid column | Add a "Follow" column alongside Shop / Customer Care / Info | ✓ |
| Inside the black bar | Place icons in the black copyright bar next to the copyright text | |

**User's choice:** 4th grid column
**Notes:** Grid shifts from `repeat(3,1fr)` → `repeat(4,1fr)`. Column gets a heading like the others. Planner must handle the 760px max-width + mobile reflow.

---

## Icon Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Bare muted icons | SVG glyphs in `--tk-text-muted`, darkening to `--tk-text` on hover, no borders | (default) |
| Circular bordered chips | Icons inside a thin circular outline, filling on hover | |
| You decide | Claude picks whichever best matches `.tk-footer` tokens | ✓ |

**User's choice:** You decide → Claude will default to bare muted icons for consistency with `.tk-footer__link`.
**Notes:** Existing inline SVGs (Instagram outline, Facebook solid) reused from the legacy `setFooterLng()`.

---

## Section Label

| Option | Description | Selected |
|--------|-------------|----------|
| Follow | EN "Follow" / HE "עקבו אחרי" | |
| Follow Us | EN "Follow Us" / HE "עקבו אחרי" | |
| Social | EN "Social" / HE "רשתות חברתיות" | |
| (free text) | User-provided | ✓ |

**User's choice:** "Follow Me" — EN "Follow Me" / HE "עקבו אחרי"
**Notes:** User rejected the preset options and asked for "Follow Me" — personal singular voice fitting a single-artisan brand. (First question presentation was cleared/reformulated at the user's request before this answer.)

---

## Legacy Footer JS

| Option | Description | Selected |
|--------|-------------|----------|
| Retire the dead path | Remove `setFooterLng()` + `handleFooterMarkup()` call (confirmed dead — targets a missing `.footer` element) | ✓ |
| Leave it untouched | Add social to SSR only, leave the dead JS in place | |
| Update it to match | Rewrite the JS to emit `.tk-footer` markup and target `.tk-footer` | |

**User's choice:** Retire the dead path
**Notes:** Footer becomes SSR-static; no JS twin needed, so the dual-render trap does not apply.

---

## Claude's Discretion

- Icon visual style (bare muted icons default), exact sizing/spacing/hover timing using `.tk-footer` tokens.
- Optional cleanup of orphaned legacy footer CSS (`.footer-social-*`, `.attrib-footer*`) if trivially safe.

## Deferred Ideas

- Cleanup of orphaned legacy footer CSS in `footer-desktop.css` / `footer-mobile.css` once `setFooterLng()` is removed — optional housekeeping, not required for FOOT-01/02/03.
