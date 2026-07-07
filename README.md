# Campfire Storefront

A complete, restyleable storefront for your [Campfire Commerce](https://campfirecommerce.com)
store — React + TypeScript + Vite + [Mantine](https://mantine.dev), with
catalog, product pages, cart, and Stripe checkout already wired to the
Campfire Store API via
[`@campfirecommerce/store-client`](https://www.npmjs.com/package/@campfirecommerce/store-client).

Your store already runs on our hosted version of this app at
`https://{your-slug}.campfirecommerce.com`. Clone this template when you
want to change more than a logo and a color: your own layout, components,
pages — it's your codebase.

## Quick start

```bash
# Use this template (or clone), then:
npm install

# Local dev: localhost isn't a registered store domain, so create a
# storefront API key in the Campfire portal (Store → API keys) and:
echo "VITE_STORE_KEY=<your key>" > .env.local

npm run dev   # http://localhost:3004
```

Everything the app renders — store name, logo, brand color, products,
prices, stock, shipping and tax — comes from the API. Change your store in
the portal and this app follows.

## Going live on your own domain

1. `npm run build` and host the `dist/` folder anywhere static
   (CloudFront, Netlify, Vercel, nginx…).
2. In the Campfire portal, add your domain to your store (Store → Domains),
   create the `_campfire-verify` TXT record it shows you, and hit Verify.
3. Done. In production the app calls `https://campfirecommerce.com/api/store`
   and the API recognizes your store from your domain — no API key, no env
   vars, one build.

## Project layout

```
src/lib/       StoreContext (store settings + client), CartContext
               (checkout lifecycle, localStorage persistence), theming
src/pages/     Catalog, Product, Cart, Checkout (Stripe Payment Element),
               Thanks (order confirmation)
```

## License

MIT
