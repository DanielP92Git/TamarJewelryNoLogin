# Phase 40: Currency Selector Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 40-currency-selector-wiring
**Areas discussed:** Homepage price model, Homepage demo cart drawer, Default / first-load currency, Cart re-render verify scope

---

## Homepage price model

### Q1 — USD price source for homepage demo products
| Option | Description | Selected |
|--------|-------------|----------|
| Per-product dual prices | Add usd + ils to each demo product; matches app dual-price model | |
| Single price + shared rate | One base price + shared exchange-rate constant | |
| Pull real featured data | Replace demo array with real backend featured products (dual prices) | ✓ |

### Q2 — How to select "featured" products (no flag exists today)
| Option | Description | Selected |
|--------|-------------|----------|
| Add a 'featured' flag | isFeatured boolean on Product + admin toggle (manual curation) | ✓ |
| First N by displayOrder | Auto-pick first ~8 by displayOrder, no schema change | |
| From one category | Feature first ~8 from a chosen highlight category | |

### Q3 — Delivery mechanism
| Option | Description | Selected |
|--------|-------------|----------|
| SSR data attributes | home.ejs renders grid server-side with usd/ils in data-*, homepage.js reads DOM | ✓ |
| Client API fetch | New /home-products endpoint; homepage.js fetches on load | |

### Q4 — Scope structure (raised by Claude: this is a new capability)
| Option | Description | Selected |
|--------|-------------|----------|
| Split into a new phase | Dedicated "Homepage Featured Products" phase; Phase 40 stays lean | ✓ |
| Expand Phase 40 | Fold featured flag + admin + SSR + currency into one big Phase 40 | |
| Keep 40 lean, demo dual prices | Just add dual prices to demo array now; defer real data later | |

### Q5 — Ordering / boundary of the split
| Option | Description | Selected |
|--------|-------------|----------|
| New phase AFTER 40 | Lean Phase 40 now; homepage grid (criterion 3/CURR-03) moves to new phase later | ✓ |
| New phase BEFORE 40 | Build featured feature first, then wire homepage currency inside Phase 40 | |
| Boundary needs tweaking | — | |

**User's choice:** Real featured data via an isFeatured flag + admin toggle, delivered through SSR data attributes — but **split into a new "Homepage Featured Products" phase that runs after Phase 40**. Phase 40 stays lean; homepage grid currency wiring (criterion 3 / CURR-03) moves to the new phase.
**Notes:** Claude flagged that featured flag + admin UI + SSR grid is a new capability beyond "currency wiring." User agreed to split for cleaner phases and verification.

---

## Homepage demo cart drawer

**User's choice:** Resolved by the split — `homepage.js` (including its separate demo cart drawer) moves entirely into the new "Homepage Featured Products" phase. Out of Phase 40 scope.
**Notes:** Not discussed independently; subsumed by the scope-split decision above.

---

## Default / first-load currency

### Q1 — Default currency when none saved
| Option | Description | Selected |
|--------|-------------|----------|
| Follow GeoIP locale | locale.js detection: Israel→ILS, else USD (already seeds localStorage) | ✓ |
| Always default USD | Everyone starts USD (current getSavedCurrency fallback) | |
| Match page language | Hebrew→ILS, English→USD (matches SSR render) | |

### Q2 — Dropdown "default" placeholder option
| Option | Description | Selected |
|--------|-------------|----------|
| Always reflect saved currency | Force dropdown to resolved usd/ils on load; placeholder never the shown state | ✓ |
| Keep 'default' option | Leave placeholder selectable | |

**User's choice:** Default follows GeoIP locale; dropdown always reflects the resolved currency on load (placeholder never shown). Delivers Phase 39's deferred D-08.
**Notes:** Claude noted SSR renders prices by language while client currency is independent — first-paint may briefly differ; accepted as the established pattern.

---

## Cart re-render verify scope

### Q1 — Verify depth
| Option | Description | Selected |
|--------|-------------|----------|
| Verify, fix only if broken | Exercise switching; change code only if it actually fails | ✓ |
| Verify + add regression test | Add an automated test to prevent re-regression | |
| You decide | Planner chooses based on findings | |

### Q2 — Reload fallback
| Option | Description | Selected |
|--------|-------------|----------|
| Keep as safety net | Leave window.location.reload() on re-render error | ✓ |
| Remove it | Drop the fallback, rely on re-render correctness | |

**User's choice:** Verify and fix only if broken (no preemptive rewrite, no mandatory test). Keep the reload fallback as a safety net.
**Notes:** The documented `this._render()` bug appears already replaced with `this.render()` + `_renderSummary()`; planning docs (STATE.md) are stale on the exact symptom.

---

## Claude's Discretion

- Whether to clean up the unused `_rate` field (`cartView.js:20`) and hardcoded `3.7` (`categoriesView.js:30`).
- Mechanism for keeping the two currency encodings consistent (`'usd'/'ils'` localStorage vs `'$'/'₪'` cart-item symbol).
- Whether to add a regression test (user did not require one; left to planner if path proves fragile).

## Deferred Ideas

- **NEW phase "Homepage Featured Products"** (after Phase 40): isFeatured schema flag + admin toggle, SSR featured grid with dual prices, homepage.js refactor (remove hardcoded CURRENCY + demo PRODUCTS, read SSR data-*, subscribe to currency-changed, currency-aware demo cart drawer). Absorbs criterion 3 / CURR-03.
- **ROADMAP/REQUIREMENTS edit:** remove Phase 40 criterion 3 + CURR-03 from Phase 40, re-home in the new phase (via `/gsd-phase`).
- Footer social — Phase 41. Mobile nav — Phase 42.
