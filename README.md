# Campfire Storefront

A complete, restyleable storefront for your
[Campfire Commerce](https://campfirecommerce.com) store — React +
TypeScript + Vite + [Material UI](https://mui.com), with catalog, product
pages, cart, and Stripe checkout already wired to the Campfire Storefront
API via
[`@campfirecommerce/store-client`](https://www.npmjs.com/package/@campfirecommerce/store-client).

Every store already runs on our hosted build of this exact app at
`https://{your-slug}.campfirecommerce.com`. Clone this template when you
want to change more than a logo and a brand color: your own layout,
components, and pages — it's your codebase, deployed wherever you like.

## Quick start

```bash
# On GitHub: "Use this template" (or clone), then:
npm install

# localhost isn't a registered store domain, so the API can't tell which
# store you are. Create a storefront API key in the Campfire portal
# (your store → API Keys tab) and put it in .env.local:
echo "VITE_STORE_KEY=<your key>" > .env.local

npm run dev   # http://localhost:3004
```

Everything the app renders comes from the API and is edited in the portal,
no code required: store name, logo, brand color, about text, support email
(Settings tab), products and stock (Products / Inventory tabs), shipping
and tax rates. Change your store in the portal and this app follows.

## How the app knows which store it is

The frontend carries no store ID. The Storefront API resolves the store
from the request:

- **Registered domain (production).** The API matches the request's
  `Origin` header against your store's registered domains — the automatic
  `{slug}.campfirecommerce.com` subdomain plus any custom domain you have
  verified (see below). No key, no env vars; one build works everywhere.
- **API key (local dev).** `localhost` isn't registered anywhere, so dev
  builds send an `X-Store-Key` header from `VITE_STORE_KEY` in
  `.env.local`. Don't ship a key in a public production build — anyone can
  read it from the bundle. It only grants what the public storefront can
  already do (browse the catalog, open checkouts), but revoking it means
  redeploying.

## Configuration

Two build-time env vars, both optional:

| Variable | When to set it |
|---|---|
| `VITE_STORE_KEY` | Local dev only, in `.env.local`. Portal → your store → **API Keys**. |
| `VITE_API_BASE_URL` | Self-hosted deploys only, e.g. `https://campfirecommerce.com/api/store`. Unset, the app calls same-origin `/api/store`, which is correct on `*.campfirecommerce.com` hosting and in local dev (Vite proxies it). |

## Customizing

```
src/App.tsx          layout shell: header, nav, footer, routes
src/pages/           CatalogPage, ProductPage, CartPage, ThanksPage
src/context/         StoreContext (store info + API client),
                     CartContext (checkout lifecycle, persisted to
                     localStorage), StoreThemeProvider (MUI theme)
src/utils/           money formatting
```

- **Theme**: `StoreThemeProvider` builds an MUI theme from your store's
  `primary_color` setting. Replace it with your own `createTheme` for full
  control over typography, spacing, and palette.
- **Routes** (`src/App.tsx`): `/` catalog, `/p/:slug` product, `/cart`
  cart, `/thanks` order confirmation. Add pages freely — react-router v6.
- Keep `CartContext` and the `/thanks?token=...` route intact (or port
  them): they drive the checkout lifecycle described below.

## Checkout

Checkout is Stripe-hosted — no card forms in this app, no Stripe.js:

1. **Check out** on the cart page creates/updates a checkout (stock is
   reserved) and requests payment; the API returns a Stripe Checkout URL
   and the browser is redirected there.
2. Stripe collects email, shipping address, and payment on stripe.com,
   then redirects back to **your** domain: `/thanks?token=...` on success
   (the page polls until the webhook marks the order complete), `/cart` on
   cancel. Return URLs are derived from the request origin, so this works
   on any domain with zero configuration.
3. The Check out button stays disabled with a notice until the store owner
   has connected a Stripe account (portal → your store → **Payments**) and
   Stripe has enabled charges on it.

Totals, shipping, and tax are always recomputed server-side; the client
never sends prices.

## Deploying

`npm run build` produces a static `dist/` — host it anywhere. Two things
every host needs:

1. **`VITE_API_BASE_URL` at build time** (see Configuration), otherwise
   API calls go to your static host and 404.
2. **SPA fallback**: the app uses `BrowserRouter`, so unknown paths like
   `/p/candle` must serve `index.html`. On most CDNs that's a rewrite
   rule; on GitHub Pages it's a `404.html` copy of `index.html`.

And for the API to recognize the deployed site, its domain must be
registered to your store — that's the custom-domain flow below. (Without
it you'll see "unregistered store domain" errors.)

### GitHub Pages

Yes, GitHub Pages works — the storefront is a pure static bundle. The
template ships a ready workflow at `.github/workflows/deploy.yml` that
builds with `VITE_API_BASE_URL` set, copies `index.html` to `404.html` for
deep links, and publishes on every push to `main`.

1. In your repo: **Settings → Pages → Source: GitHub Actions**. Push to
   `main` (or run the workflow manually) — the site appears at
   `https://<user>.github.io/<repo>/`.
2. Add your custom domain in **Settings → Pages → Custom domain** and
   create the DNS record GitHub shows you (a `CNAME` from e.g.
   `shop.example.com` to `<user>.github.io`; GitHub provisions HTTPS
   automatically).
3. Register that same domain with your Campfire store (next section) so
   the API starts answering it.

Note: on the `*.github.io` preview URL (before the custom domain) the
catalog shows "unregistered store domain" — `github.io` can't be verified
as yours. The custom domain fixes both that and the `/<repo>/` base-path
quirk of project pages, so go straight to it for anything real.

### Other hosts

Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, nginx — all fine.
Set `VITE_API_BASE_URL` in the build environment and add the SPA rewrite
(`/* → /index.html`, 200). Then register the domain as below.

## Custom domains

Two independent halves:

1. **Point the domain at your host** — the CNAME/A records your static
   host asks for. (This template is self-hosted; the domain serves *your*
   deploy, not ours.)
2. **Prove the domain to Campfire** so the Storefront API accepts requests
   originating from it: portal → your store → **Domains** → add the
   hostname. You'll get a TXT challenge — create
   `_campfire-verify.<your-hostname>` with the shown token at your DNS
   provider, wait for propagation, and hit **Verify**. Status flips to
   active and the API immediately starts resolving your store from that
   origin.

Register the exact hostname the site is served from (`www.shop.example.com`
and `shop.example.com` are different hostnames — add both if both serve
the site).

## License

MIT. This template is developed in the Campfire Commerce monorepo and
mirrored here; issues and PRs are welcome and may be applied upstream.
