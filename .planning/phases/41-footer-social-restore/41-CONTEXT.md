# Phase 41: Footer Social Restore - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add working Instagram and Facebook social links into the global prototype footer (`.tk-footer`), styled in the footer's own visual language, rendering correctly on every page in both LTR (`/en`) and RTL (`/he`) layouts.

**In scope:** social links in the SSR footer partial, matching `.tk-footer` styling, RTL correctness, retiring the now-dead legacy footer JS path.

**Out of scope (other phases / capabilities):** any new footer content beyond social links, mobile-navigation work (Phase 42), cart-drawer work (Phase 43), broader footer redesign.

</domain>

<decisions>
## Implementation Decisions

### Placement
- **D-01:** The social section is a **4th column** in the `.tk-footer__cols` grid, alongside the existing `Shop` / `Customer Care` / `Info` columns (grid goes from `repeat(3, 1fr)` → `repeat(4, 1fr)`). The icons sit under a column heading, like the other columns. NOT a separate centered row and NOT inside the black `__bar`.
- **D-02:** Adding a 4th column requires the layout to stay correct at the existing `max-width: 760px` constraint and in the `<800px` mobile media query (where `.tk-footer__cols` currently keeps 3 columns with reduced gap). Planner must ensure the 4-column grid reflows sanely on mobile (stacking / wrapping) rather than cramming four columns into a narrow viewport.

### Section Label
- **D-03:** The social column has a heading styled like the other column headings (`.tk-footer__heading`, uppercase). Text: **EN "Follow Me"**, **HE "עקבו אחרי"**. Singular/personal voice — this is a single-artisan brand.

### Icon Visual Style
- **D-04:** Reuse the existing inline SVG icons already present in `View.js` `setFooterLng()` (Instagram = outline/stroke, Facebook = solid fill) — port the SVG markup into the SSR partial before retiring the JS.
- **D-05:** *(Claude's discretion — see below)* Default to **bare muted icons** (no borders): colored `var(--tk-text-muted)`, darkening to `var(--tk-text)` on hover, sized/spaced to match the understated `.tk-footer__link` treatment. Circular bordered chips were explicitly available but the prototype footer uses no such element, so bare icons keep visual consistency.

### Links (locked by requirements — FOOT-02)
- **D-06:** Instagram → `https://www.instagram.com/tamar_kfir_jewelry/`
- **D-07:** Facebook → `https://www.facebook.com/tamarkfirjewelry`
- Open in a new tab: `target="_blank" rel="noopener noreferrer"`, with `aria-label` per icon (matches existing legacy markup).

### Legacy Footer JS
- **D-08:** **Retire the dead path.** Remove `setFooterLng()` and the `handleFooterMarkup()` call (View.js ~L928 call site, L1073–L1206 definitions). Confirmed dead: `handleFooterMarkup()` does `document.querySelector('.footer')`, but no `.footer` element exists in any SSR view (only `.tk-footer`), so it never fires. Social will live **only** in the SSR partial — the footer is now SSR-static, so no JS twin is needed and the dual-render trap does not apply here.

### Claude's Discretion
- Exact icon size, padding, gap, and hover transition timing — match `.tk-footer` tokens (`--tk-text-muted`, `--tk-text`, `--tk-dur`, `--tk-ease`). Default to bare muted icons (D-05).
- Whether to also clean up now-orphaned legacy social CSS (`.footer-social-*` in `footer-desktop.css` / `footer-mobile.css`) — see Deferred; planner may include if low-risk, otherwise leave.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 41: Footer Social Restore" — goal + 4 success criteria
- `.planning/REQUIREMENTS.md` — FOOT-01, FOOT-02, FOOT-03

### Footer dual-render & chrome rollout (READ — critical context)
- `CLAUDE.md` §"SSR + Client Dual-Render" — footer dual-render rule and the Footer ↔ View.js mapping (note: this phase intentionally removes the JS twin, making the footer SSR-only)
- `.claude/skills/tamar_homepage_vanilla/index.html` L122–142 — the canonical `.tk-footer` prototype markup (NOTE: prototype has **no** social section — the design is a genuine decision, not a copy)

### Files to change
- `backend/views/partials/footer.ejs` — global SSR footer partial; add the 4th "Follow Me" social column here
- `frontend/css/homepage.css` L342–348 (`.tk-footer*` rules) + L418 (mobile `.tk-footer__cols`) — where the new `.tk-footer__social` / 4-column styling goes
- `frontend/js/View.js` L928 (call), L1073–L1206 (`setFooterLng` + `handleFooterMarkup`) — code to retire

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Inline social SVGs** already exist in `View.js` `setFooterLng()` (L1116–1127 EN, L1178–1189 HE) — Instagram outline + Facebook solid. Port these into `footer.ejs`, then delete the JS.
- **`.tk-footer` token-based styling** (`homepage.css` L342–348) uses CSS custom properties (`--tk-white`, `--tk-border`, `--tk-text`, `--tk-text-muted`, `--tk-size-label`, `--tk-track-*`, `--tk-dur`, `--tk-ease`, `--tk-black`). The new social styles must use these same tokens. Tokens also live in `frontend/css/tokens.css` (new, untracked).
- **EJS bilingual pattern** in `footer.ejs` already established: `var _eng = lang === 'eng'` + `<% if (_eng) { %>…<% } else { %>…<% } %>` and `urlLang` for hrefs. Mirror it for the heading text.

### Established Patterns
- Footer partial is **global** and rendered for every page (homepage + all SSR pages). One edit in `footer.ejs` covers the whole site.
- Footer is now intended to be **SSR-static** — Phase 41 reinforces this by removing the only JS that touched it.

### Integration Points / Watch-outs
- **RTL:** `.tk-footer__cols` is a CSS grid; in RTL the column order auto-reverses. Verify the 4th column lands correctly and icon row direction reads naturally on `/he`. The legacy footer used explicit `direction: rtl` overrides — the grid should not need them, but confirm.
- **Mobile grid:** the `<800px` media query (`homepage.css` L418) currently only changes the gap, leaving 3 columns. A 4th column will need a mobile rule (stack or 2×2) so it doesn't overflow at 760px max-width.
- **Chrome-rollout CSS conflicts:** per `[[chrome-rollout-css-conflicts]]`, legacy per-page CSS can hijack new `tk-*` chrome on non-home pages. Footer is lower-risk than nav, but verify the social column renders identically on a non-home SSR page (e.g. `/en/about`), not just the homepage.

</code_context>

<specifics>
## Specific Ideas

- Heading wording is deliberately personal: **"Follow Me"** (not "Follow Us" / "Social") — reflects the single-maker brand voice. HE: "עקבו אחרי".
- Icons should feel understated and consistent with the existing muted footer links, not loud or button-like.

</specifics>

<deferred>
## Deferred Ideas

- **Cleanup of orphaned legacy footer CSS** (`.footer-social-*`, `.attrib-footer*`, `.columns-container`, `.rights-container` in `footer-desktop.css` / `footer-mobile.css`) once `setFooterLng()` is gone. Optional housekeeping — planner may fold in if trivially safe, otherwise a future tidy-up. Not required to satisfy FOOT-01/02/03.

</deferred>

---

*Phase: 41-footer-social-restore*
*Context gathered: 2026-06-25*
