/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Storefront API key for local dev, where requests have no registered
   * Origin. Put it in .env.local; leave unset in production builds so the
   * backend resolves the store from the domain.
   */
  readonly VITE_STORE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
