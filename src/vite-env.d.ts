/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Storefront API key for local dev, where requests have no registered
   * Origin. Put it in .env.local; leave unset in production builds so the
   * backend resolves the store from the domain.
   */
  readonly VITE_STORE_KEY?: string;
  /**
   * Absolute Storefront API base URL, e.g.
   * https://campfirecommerce.com/api/store. Required when the built site is
   * hosted somewhere other than *.campfirecommerce.com (GitHub Pages, your
   * own CDN); unset it calls same-origin /api/store.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
