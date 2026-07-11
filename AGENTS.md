# Campfire Storefront — AI agent guide

This is a customer-owned storefront for a [Campfire Commerce](https://campfirecommerce.com)
store: React 18 + TypeScript + Vite + Material UI (MUI v5). All store data
(catalog, cart, checkout) comes from the Campfire Storefront API via
`@campfirecommerce/store-client`. Your job is usually to restyle or extend
the UI — the commerce plumbing below already works.

## Golden rules

1. **Never compute or send prices from the client.** The API reprices every
   checkout server-side from `variant_id` + `quantity`. Display prices from
   API responses; don't do money math beyond formatting.
2. **Never add card forms or Stripe.js.** Payment happens on Stripe-hosted
   Checkout: `pay()` returns a URL and the browser is redirected there. PCI
   compliance depends on this.
3. **Keep the checkout lifecycle intact.** `src/context/CartContext.tsx` and
   the `/thanks` route (with its `?token=` polling) drive cart persistence,
   stock reservation, and order confirmation. Restyle them freely; if you
   restructure, port their logic, don't drop it.
4. **All amounts are integer cents.** Format with `money(cents)` from
   `useStore()` (locale + store currency aware); never hardcode `$`.
5. **Don't hardcode store identity.** Name, logo, brand color, about text,
   and support email come from `store.settings` and are edited in the
   Campfire portal. Read them from `useStore()`.
6. **Respect `store.checkout_enabled`.** When false (store hasn't connected
   Stripe yet), keep the pay/checkout action disabled with an explanation.

Everything else — layout, typography, colors, pages, animation, component
structure — is fair game. Make it unrecognizable.

## Commands

```bash
npm install
npm run dev     # http://localhost:3004
npm run build   # static dist/
```

Local dev needs a storefront API key (localhost isn't a registered store
domain): create one in the Campfire portal (your store → API Keys) and put
`VITE_STORE_KEY=<key>` in `.env.local`. Never ship that key in a deployed
bundle — production builds omit it; the API resolves the store from the
site's registered domain (Origin header) instead.

Build-time env vars (both optional):

| Var | Purpose |
|---|---|
| `VITE_STORE_KEY` | Local dev only (`.env.local`). |
| `VITE_API_BASE_URL` | Self-hosted deploys: `https://campfirecommerce.com/api/store`. Unset = same-origin `/api/store` (correct on `*.campfirecommerce.com` hosting and in local dev). |

## Code map

```
src/main.tsx                       provider stack: StoreProvider > StoreThemeProvider
                                   > CartProvider > BrowserRouter > App
src/App.tsx                        chrome (AppBar, footer) + routes
src/pages/CatalogPage.tsx          product grid, search, tags, paging
src/pages/ProductPage.tsx          variants, availability, add to cart
src/pages/CartPage.tsx             line items, totals, "Check out" button
src/pages/ThanksPage.tsx           post-payment polling + order confirmation
src/context/StoreContext.tsx       StoreClient + public store info + money()
src/context/CartContext.tsx        cart state machine over the checkout API
src/context/StoreThemeProvider.tsx MUI theme from store.settings.primary_color
src/utils/format.ts                formatMoney(cents, currency)
```

Routes: `/` catalog, `/p/:slug` product, `/cart` cart, `/thanks` order
confirmation (react-router v6). Add pages freely; keep `/thanks`.

## Hooks

```ts
const { client, store, error, money } = useStore();
// client: StoreClient   store: StorefrontStore | null (null while loading)
// money(cents) => localized string in the store's currency

const { checkout, busy, itemCount, addItem, setQuantity, removeItem, pay, clear } = useCart();
// addItem(variantId, qty)   setQuantity(variantId, qty)  removeItem(variantId)
// pay() => Promise<PayResponse>  — then: window.location.assign(res.url)
// clear() forgets the local checkout (ThanksPage calls it after completion)
```

`CartContext` persists the checkout token in localStorage, transparently
recreates expired checkouts (HTTP 410/404), and cancels the checkout when
the cart empties so reserved stock is released immediately.

## API reference (`@campfirecommerce/store-client`)

```ts
const client = new StoreClient();                    // registered domain
const client = new StoreClient({ baseUrl, storeKey }); // dev / server-side
```

| Method | Endpoint | Notes |
|---|---|---|
| `getStore()` | `GET /storefront/store` | name, slug, currency, `settings`, `checkout_enabled` |
| `listProducts(params?)` | `GET /storefront/products` | `{query?, tag?, page?, per_page?}` → paginated |
| `getProduct(slug)` | `GET /storefront/products/:slug` | variants with live `available` stock |
| `createCheckout(input)` | `POST /storefront/checkouts` | reserves stock; returns `checkout.token` |
| `getCheckout(token)` | `GET /storefront/checkouts/:token` | poll this on /thanks |
| `updateCheckout(token, input)` | `PUT /storefront/checkouts/:token` | replace lines / set email, address |
| `cancelCheckout(token)` | `DELETE /storefront/checkouts/:token` | releases stock reservations now |
| `payCheckout(token)` | `POST /storefront/checkouts/:token/pay` | reprices, returns Stripe Checkout `url` |

Key types (all exported):

```ts
StorefrontStore  { name, slug, currency, settings, checkout_enabled }
StoreSettings    { flat_shipping_cents, free_shipping_min_cents, tax_rate_bps,
                   logo_url?, primary_color?, about?, support_email? }
StorefrontProduct{ id, title, slug, description, images, tags, variants }
StorefrontVariant{ id, title, sku, price_cents, compare_at_cents,
                   requires_shipping, available }
Checkout         { token, status: 'open'|'completed'|'expired', line_items,
                   email, shipping_address, subtotal_cents, tax_cents,
                   shipping_cents, total_cents, expires_at }
CheckoutInput    { line_items?: {variant_id, quantity}[], email?, shipping_address? }
PayResponse      { checkout, url }   // redirect the browser to url
```

Errors throw `StoreApiError { status, message }`. Meaningful statuses:
`401` unregistered domain / bad key (local dev: set `VITE_STORE_KEY`),
`404`/`410` checkout gone or expired (start a fresh one), `409` payment
attempted while `checkout_enabled` is false or stock ran out.

## Checkout lifecycle

1. Add to cart → `createCheckout` (first item) or `updateCheckout`. Stock is
   reserved; the checkout carries `expires_at`.
2. "Check out" → `payCheckout(token)` → redirect to the returned Stripe URL.
   Stripe collects email, shipping address, and payment on stripe.com.
3. Stripe redirects back to `/thanks?token=...` (success) or `/cart`
   (cancel). Return URLs derive from the request origin — any domain works.
4. ThanksPage polls `getCheckout(token)` until the Stripe webhook flips
   `status` to `completed` (up to ~2 min), then shows the order and calls
   `clear()`.

## Theming

`StoreThemeProvider` builds the MUI theme from `store.settings.primary_color`.
For full control (typography, spacing, palette, dark mode), replace it with
your own `createTheme` — keeping the primary color from settings is nice but
optional.

## Deploying

`npm run build` → static `dist/`, host anywhere. Every host needs:
`VITE_API_BASE_URL` set at build time, and an SPA fallback (unknown paths
serve `index.html`). A ready GitHub Pages workflow ships in
`.github/workflows/deploy.yml`. For the API to answer a self-hosted domain
with no key, register the exact hostname in the portal (store → Domains,
`_campfire-verify` TXT record). Full walkthrough: README.md.

## Note for monorepo contributors

This app is developed in the Campfire Commerce monorepo
(`web/storefront-base`) and mirrored to the public template repo by
`scripts/mirror-storefront.sh`. In the monorepo, use `rush build` /
`rushx dev` instead of npm, and the `workspace:*` store-client; everything
else above applies unchanged.
