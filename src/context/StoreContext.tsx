import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StoreClient, StoreApiError, type StorefrontStore } from '@campfirecommerce/store-client';
import { formatMoney } from '../utils/format';

interface StoreContextValue {
  client: StoreClient;
  /** Public store info; null while loading. */
  store: StorefrontStore | null;
  error: string | null;
  /** Format cents in the store's currency. */
  money: (cents: number) => string;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // In local dev there is no registered Origin, so a storefront API key is
  // pasted into .env.local. Production builds omit it: the backend resolves
  // the store from the site's domain.
  // Self-hosted builds (e.g. GitHub Pages) set VITE_API_BASE_URL so calls
  // reach the Campfire API instead of the static host; hosted builds leave
  // it unset and call same-origin /api/store.
  const client = useMemo(
    () =>
      new StoreClient({
        baseUrl: import.meta.env.VITE_API_BASE_URL || undefined,
        storeKey: import.meta.env.VITE_STORE_KEY || undefined,
      }),
    [],
  );
  const [store, setStore] = useState<StorefrontStore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    client
      .getStore()
      .then((res) => {
        if (!cancelled) setStore(res.store);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof StoreApiError && err.status === 401) {
          setError(
            `${err.message} — for local development, set VITE_STORE_KEY in .env.local to a storefront API key.`,
          );
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load store');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const value = useMemo<StoreContextValue>(
    () => ({
      client,
      store,
      error,
      money: (cents: number) => formatMoney(cents, store?.currency ?? 'usd'),
    }),
    [client, store, error],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
