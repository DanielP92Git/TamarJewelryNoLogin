# Requirements: Tamar Kfir Jewelry — v1.7 Homepage / Global-Chrome Redesign Rollout

**Defined:** 2026-06-23
**Core Value:** A discoverable, professional online jewelry store that ranks in search engines, looks great when shared on social platforms, and converts visitors into customers — with true bilingual content so Hebrew and English visitors each see products in their language.

**Milestone goal:** Finish the approved homepage/global-chrome prototype rollout — polish the new `.tk-*` header/footer chrome and make it fully functional (currency, social, mobile) across the bilingual site.

## v1.7 Requirements

### Header Utilities Layout (HEADER)

- [x] **HEADER-01**: Visitor sees EN/HE as two separate refined flag icons (US + IL) in the header utilities cluster — active flag full color, inactive dimmed (no ring)
- [x] **HEADER-02**: Currency selector renders as a styled dropdown matching the approved design
- [x] **HEADER-03**: Header utilities show cart icon + item count, currency dropdown, and flags in the approved order Flags → Currency → Cart and spacing; nav links centered with TK logo at the far end
- [x] **HEADER-04**: Header utilities layout mirrors correctly for RTL on `/he` pages

### Currency Selector Wiring (CURR)

- [x] **CURR-01**: Changing the currency selector updates all displayed prices without a URL language switch
- [x] **CURR-02**: The `currency-changed` event re-renders prices across the page (header-driven)
- [ ] **CURR-03**: Home featured product grid prices respect `localStorage.currency` and update on currency change (remove hardcoded ILS in `homepage.js`)
- [ ] **CURR-04**: Cart drawer prices respect `localStorage.currency` and update on currency change (remove hardcoded ILS)
- [x] **CURR-05**: Selected currency persists across page loads and navigation

### Footer Social Restore (FOOT)

- [ ] **FOOT-01**: Prototype footer displays Instagram and Facebook social links
- [ ] **FOOT-02**: Social links point to the correct profiles (instagram.com/tamar_kfir_jewelry, facebook.com/tamarkfirjewelry)
- [ ] **FOOT-03**: Social section styling matches the prototype footer's visual language and renders correctly in RTL

### Mobile Navigation (NAV)

- [ ] **NAV-01**: A hamburger menu button appears in the prototype nav below 800px
- [ ] **NAV-02**: Tapping the hamburger opens a mobile menu exposing the nav links
- [ ] **NAV-03**: Mobile menu can be dismissed (toggle, close button, or outside tap)
- [ ] **NAV-04**: Language and currency controls remain accessible on mobile screens
- [ ] **NAV-05**: Mobile nav works without destructive `View.setLanguage` rewrites and renders correctly in RTL

## Future Requirements

Deferred to a later milestone. Tracked but not in this roadmap.

### Storefront Backend (SHOP)

- **SHOP-01**: All-products "Shop" route (nav "Shop" currently maps to `/necklaces`)
- **SHOP-02**: Home featured grid backed by real catalogue data (currently demo data)
- **SHOP-03**: Cart drawer backed by the real cart/checkout flow (currently self-contained prototype demo)
- **SHOP-04**: Newsletter signup wired to a real endpoint (currently a stub)

## Out of Scope

Explicitly excluded for v1.7. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real catalogue / cart / checkout / newsletter endpoints | This milestone is chrome polish + wiring; backend storefront work is a separate future milestone |
| All-products "Shop" route | Tracked as SHOP-01; nav "Shop" stays mapped to `/necklaces` for now |
| Inner-page body layout restyle under new chrome | Only global chrome + home body are in the prototype scope; inner pages keep existing body layouts |
| RTL drawer-from-left mirroring | Drawer remains in its current direction; full RTL drawer mirroring deferred |
| Reintroducing destructive `View.setLanguage` chrome rewrites | Violates the SSR-static chrome / dual-render rule (CLAUDE.md) established by the prototype integration |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HEADER-01 | Phase 39 | Complete |
| HEADER-02 | Phase 39 | Complete |
| HEADER-03 | Phase 39 | Complete |
| HEADER-04 | Phase 39 | Complete |
| CURR-01 | Phase 40 | Complete |
| CURR-02 | Phase 40 | Complete |
| CURR-03 | Phase 40.1 | Pending |
| CURR-04 | Phase 40 | Pending |
| CURR-05 | Phase 40 | Complete |
| FOOT-01 | Phase 41 | Pending |
| FOOT-02 | Phase 41 | Pending |
| FOOT-03 | Phase 41 | Pending |
| NAV-01 | Phase 42 | Pending |
| NAV-02 | Phase 42 | Pending |
| NAV-03 | Phase 42 | Pending |
| NAV-04 | Phase 42 | Pending |
| NAV-05 | Phase 42 | Pending |

**Coverage:**
- v1.7 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-23*
*Last updated: 2026-06-23 — traceability populated after roadmap creation (Phases 39-42)*
