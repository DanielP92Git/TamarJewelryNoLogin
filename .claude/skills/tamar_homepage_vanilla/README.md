# Tamar Kfir Jewelry — Homepage (vanilla HTML/CSS/JS)

A framework-free, drop-in version of the approved homepage prototype. **No React, no build step.** Open `index.html` in a browser and it runs. This is the file set to merge into your existing vanilla-JS MVC storefront.

> The original prototype was built on a React-based prototyping runtime. This folder is the **faithful vanilla conversion** of it — same markup structure, same design-system tokens, same interactions — so you don't lose fidelity translating JSX by hand.

---

## What's here

```
tamar_homepage_vanilla/
├── index.html          # full homepage markup (static; products injected by JS)
├── css/
│   ├── tokens.css      # design-system tokens (colors, type, spacing, motion) + Google Fonts
│   └── homepage.css    # component recreations + page layout (all hover/press in pure CSS)
├── js/
│   └── homepage.js     # featured-grid render + cart drawer + nav scroll + newsletter + toast
└── assets/             # logo, hero/story imagery, category tiles, product photos, whatsapp icon
```

## Run it locally

Because the CSS/JS are linked as relative files, open it through a tiny static server (not `file://`, which can block some browsers from loading the assets):

```bash
cd tamar_homepage_vanilla
python3 -m http.server 8000
# visit http://localhost:8000
```

---

## Sections (top → bottom)

1. **Hero** — full-bleed photo, transparent NavBar (white inverted logo), eyebrow + "One of a kind in mind" tagline + gold outline-pill CTA that scrolls to Collections.
2. **Collections** — 2-up category grid; label letter-spacing opens on hover (the brand's signature treatment).
3. **Maker story** — beige split section, close-up image left, first-person copy right + ghost "Read my story" link.
4. **Featured Pieces** — centered flex-wrap of `20rem` ProductCards (image zoom on hover, gold sale badge, "Add to Cart" bar).
5. **Newsletter** — quiet sign-up band with gold focus ring on the input.
6. **Footer** — 3-column links over white, black copyright bar.
7. **Cart drawer** — slides in from the right on add-to-cart; line items, remove, live subtotal, checkout button.
8. **Floating WhatsApp** + **toast** for "coming soon" feedback.

## Interactions (in `homepage.js`)

- **Add to cart** → updates `cart[]`, re-renders the drawer, opens it, bumps the nav count badge.
- **Remove** line / **Escape** key / overlay click → close or update the cart.
- **Nav + footer links** → `Home` scrolls top, `Shop` scrolls to Collections, everything else shows a toast (wire to real routes).
- **Newsletter submit** → validates non-empty email, swaps button to "Thank you", toast.

---

## Integrating into the production MVC site

The DOM structure + class names are the **design contract** — keep them; swap the plumbing:

1. **Tokens once.** Link `css/tokens.css` globally (or merge into your existing token sheet). Everything reads `var(--tk-*)`.
2. **Templating.** Move the static markup in `index.html` into your home View's template (EJS/whatever you use). The featured products are currently injected by `homepage.js` from a demo `PRODUCTS` array — **replace that with your catalogue model** and render the cards server-side or through your existing View, keeping the `.tk-prod*` classes.
3. **Cart.** Replace `addToCart` / `removeItem` / `renderCart` in `homepage.js` with calls into your real cart controller; keep the drawer DOM (`#tk-drawer`, `.tk-line`) and just feed it your cart state.
4. **Routing.** Replace the `onNavigate` toast stubs with your real navigation for nav, footer, category tiles, and "View All".
5. **Currency / RTL.** Flip `CURRENCY` at the top of `homepage.js` for `$`/`₪`. For Hebrew, wrap the page in `dir="rtl"` — `tokens.css` auto-remaps the font families to Rubik (mirror the drawer to slide from the left).

## Design tokens reference (exact values)

| Token | Value | Use |
|---|---|---|
| `--tk-gold` / `--tk-gold-hover` | `#c5a572` / `#bca366` | accent, eyebrows, sale price, outline CTA |
| `--tk-ink` / `--tk-ink-deep` | `#1f2937` / `#111827` | primary buttons, headings |
| `--tk-black` | `#000000` | footer bar |
| `--tk-text` / `-soft` / `-muted` / `-faint` | `#333` / `#555` / `#666` / `#999` | text ramp |
| `--tk-surface` / `-beige` | `#fafafa` / `#f5f5f0` | image wells / product cards |
| `--tk-border` / `-strong` / `-light` | `#e5e5e5` / `#d8d8d2` / `#f0f0f0` | hairlines |
| fonts | Montserrat (display/body), Cormorant Garamond (titles), Rubik (Hebrew) | — |
| radii | `0` buttons/modal · `4px` inputs · `8px` cards · `50px` hero pill | sharp = luxury |
| shadows | card `0 2px 8px /.08`, hover `0 4px 12px /.12` | whisper-soft |
| motion | `0.2–0.4s`, ease `cubic-bezier(.4,0,.2,1)`, hover lift `-3px` | — |

## Notes

- Fonts load from Google Fonts (same as the live site); no local binaries.
- Cormorant Garamond is the design system's editorial serif for titles — swap if your store standardized on a different serif.
- Product names/prices/badges in `homepage.js` are demo data; the live store should drive these from real product records.
