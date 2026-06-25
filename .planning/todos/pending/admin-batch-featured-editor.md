---
id: todo-admin-batch-featured-editor
type: enhancement
status: pending
priority: medium
created: "2026-06-25"
source: Phase 40.1 execution — human verification (Step 7a)
tags: [admin, featured, homepage, batch-edit, ux]
resolves_phase: null
---

# Batch "feature on homepage" editor in admin

## Context

Phase 40.1 shipped per-product homepage featuring: a "Featured on Homepage"
checkbox + "Featured Order" input in the add/edit product forms
(`admin/BisliView.js`), persisted via `isFeatured`/`featuredOrder` on the Product
model and surfaced by the SSR featured grid on `home.ejs`.

During end-to-end verification the user approved the per-product flow but asked for
a **batch** path: select many products at once and feature them together, instead of
opening each product's edit form one at a time. This is most painful when curating the
homepage from scratch or reshuffling the featured set.

## What's wanted

- Admin selects multiple products (e.g. checkboxes/multi-select on the products list),
  then applies "feature these" in one action.
- Recommend the best UI/UX for the batch apply — candidates to evaluate:
  - Bulk-action toolbar on the products list ("Feature selected" / "Unfeature selected").
  - A dedicated "Homepage Featured" management screen with drag-to-order of the chosen 8.
  - Inline multi-select + a single Save that PATCHes all selected ids.
- Decide how `featuredOrder` is assigned in batch (append at end vs. drag-order in the
  picker) — the existing pre-save auto-order hook appends at end-of-list when order is
  blank, which a batch flow can lean on.
- Likely needs a backend batch-update endpoint (or repeated `/updateproduct/:id` calls)
  behind the existing `requireAdmin` chain.

## Also noted (separate, lower priority)

Per-product **discount** could not be exercised during 40.1 verification because only a
batch discount path exists today — there is no way to discount a single product. Worth a
separate todo if the team wants per-product discounts (would also let the "Sale" badge be
tested on the featured grid).

## Origin

Deferred from Phase 40.1 (homepage featured products) so the in-scope per-product flow
could ship. New feature with its own UI/UX design work — not a gap in 40.1.
