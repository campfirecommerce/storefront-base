This repository is a Campfire Commerce storefront template: React 18 +
TypeScript + Vite + Material UI, with all commerce data served by the
Campfire Storefront API through `@campfirecommerce/store-client`.

AGENTS.md at the repo root is the canonical guide — codebase map, full API
reference, checkout lifecycle, env vars. Follow it.

Hard rules: never compute or send prices from the client (the API reprices
everything server-side); never add card forms or Stripe.js (payment is
Stripe-hosted — `pay()` returns a redirect URL); keep
`src/context/CartContext.tsx` and the `/thanks?token=` polling route
working; format money with `money(cents)` from `useStore()` (amounts are
integer cents); read store name/logo/colors from `useStore().store.settings`
rather than hardcoding; keep checkout disabled while
`store.checkout_enabled` is false. Everything visual is fair game.
