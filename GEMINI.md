# GEMINI.md

Read AGENTS.md before making changes — it is the canonical guide for this
codebase: architecture map, `@campfirecommerce/store-client` API reference,
checkout lifecycle, and the invariants that must not break.

The short version: this is a Campfire Commerce storefront (React + TS +
Vite + MUI). Restyle anything, but never compute prices client-side, never
add card forms (payment is Stripe-hosted via `pay()` → redirect), keep
`src/context/CartContext.tsx` and the `/thanks?token=` route working, and
read store identity from `useStore()` instead of hardcoding it.
