import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  StoreApiError,
  type Checkout,
  type CheckoutLineInput,
  type PayResponse,
} from '@campfirecommerce/store-client';
import { useStore } from './StoreContext';

const TOKEN_KEY = 'storefront.checkout_token';

interface CartContextValue {
  /** The open checkout backing the cart; null when the cart is empty. */
  checkout: Checkout | null;
  /** True while a cart mutation is in flight. */
  busy: boolean;
  itemCount: number;
  addItem: (variantId: number, quantity: number) => Promise<void>;
  setQuantity: (variantId: number, quantity: number) => Promise<void>;
  removeItem: (variantId: number) => Promise<void>;
  /** Create the Stripe-hosted Checkout Session; redirect to its url. */
  pay: () => Promise<PayResponse>;
  /** Forget the current checkout (e.g. after a completed order). */
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function linesOf(checkout: Checkout): CheckoutLineInput[] {
  return checkout.line_items.map((li) => ({
    variant_id: li.variant_id,
    quantity: li.quantity,
  }));
}

/** Gone/NotFound mean the checkout expired or vanished — start over. */
function isStale(err: unknown): boolean {
  return err instanceof StoreApiError && (err.status === 410 || err.status === 404);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { client } = useStore();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [busy, setBusy] = useState(false);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setCheckout(null);
  }, []);

  const adopt = useCallback((co: Checkout) => {
    localStorage.setItem(TOKEN_KEY, co.token);
    setCheckout(co);
  }, []);

  // Restore a persisted checkout on load; drop it if no longer open.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    let cancelled = false;
    client
      .getCheckout(token)
      .then((res) => {
        if (cancelled) return;
        if (res.checkout.status === 'open') setCheckout(res.checkout);
        else clear();
      })
      .catch((err: unknown) => {
        if (!cancelled && isStale(err)) clear();
      });
    return () => {
      cancelled = true;
    };
  }, [client, clear]);

  /**
   * PUT the given lines onto the current checkout, transparently recreating
   * the checkout when the stored one has expired (410/404).
   */
  const putLines = useCallback(
    async (lines: CheckoutLineInput[]) => {
      const current = checkout;
      if (lines.length === 0) {
        // The API requires at least one line, so an emptied cart cancels
        // the checkout, releasing its stock reservations immediately.
        if (current && current.status === 'open') {
          try {
            await client.cancelCheckout(current.token);
          } catch (err) {
            // Already expired or completed — nothing left to release.
            if (!isStale(err)) throw err;
          }
        }
        clear();
        return;
      }
      try {
        if (current && current.status === 'open') {
          const res = await client.updateCheckout(current.token, { line_items: lines });
          adopt(res.checkout);
          return;
        }
      } catch (err) {
        if (!isStale(err)) throw err;
        clear();
      }
      const res = await client.createCheckout({ line_items: lines });
      adopt(res.checkout);
    },
    [client, checkout, adopt, clear],
  );

  const withBusy = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const addItem = useCallback(
    (variantId: number, quantity: number) =>
      withBusy(async () => {
        const lines = checkout && checkout.status === 'open' ? linesOf(checkout) : [];
        const existing = lines.find((l) => l.variant_id === variantId);
        if (existing) existing.quantity += quantity;
        else lines.push({ variant_id: variantId, quantity });
        await putLines(lines);
      }),
    [checkout, putLines, withBusy],
  );

  const setQuantity = useCallback(
    (variantId: number, quantity: number) =>
      withBusy(async () => {
        if (!checkout) return;
        const lines = linesOf(checkout)
          .map((l) => (l.variant_id === variantId ? { ...l, quantity } : l))
          .filter((l) => l.quantity > 0);
        await putLines(lines);
      }),
    [checkout, putLines, withBusy],
  );

  const removeItem = useCallback(
    (variantId: number) => setQuantity(variantId, 0),
    [setQuantity],
  );

  const pay = useCallback(
    () =>
      withBusy(async () => {
        if (!checkout) throw new Error('cart is empty');
        const res = await client.payCheckout(checkout.token);
        setCheckout(res.checkout);
        return res;
      }),
    [client, checkout, withBusy],
  );

  const itemCount = useMemo(
    () => (checkout ? checkout.line_items.reduce((n, li) => n + li.quantity, 0) : 0),
    [checkout],
  );

  const value = useMemo<CartContextValue>(
    () => ({ checkout, busy, itemCount, addItem, setQuantity, removeItem, pay, clear }),
    [checkout, busy, itemCount, addItem, setQuantity, removeItem, pay, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
