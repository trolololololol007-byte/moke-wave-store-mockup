# Smoke Wave store mockup

Clickable mockup of the Smoke Wave wholesale ordering website: catalog, search, basket with whole-order price tiers, checkout and the order page.

Live version: GitHub Pages of this repository. Locally, open `index.html` in a browser; no build step or server is needed.

The source of truth is `docs/product/design/customer-store/` in the main Smoke Wave repository. Copy changes from there.

## Files

- `index.html`, `styles.css`, `app.js`: the interface.
- `core.js`: pricing, basket, minimum order, delivery fields and search (`window.SW`).
- `data.js`: catalog data: in-stock products only, prices in BYN for the 10/30/50/100 tiers, stock capped at 99.

Use the "Demo" control in the corner to try the main scenarios. The bot link and order numbers are placeholders.
