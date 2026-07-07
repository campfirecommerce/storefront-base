import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004,
    strictPort: true,
    proxy: {
      // Local dev proxies API calls to Campfire Commerce. localhost has no
      // registered store domain, so set VITE_STORE_KEY in .env.local (create
      // a storefront API key in the portal). In production on your store's
      // domain the key is unnecessary — the API resolves your store from the
      // request Origin.
      '/api': {
        target: 'https://campfirecommerce.com',
        changeOrigin: true,
      },
    },
  },
});
