import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import type { Checkout } from '@campfirecommerce/store-client';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // give the Stripe webhook up to ~2 minutes

type Phase = 'polling' | 'completed' | 'failed' | 'timeout';

export function ThanksPage() {
  const [searchParams] = useSearchParams();
  const { client, money } = useStore();
  const { checkout: cartCheckout, clear } = useCart();

  // Stripe redirects back with our token plus its own params.
  const token = searchParams.get('token') ?? cartCheckout?.token ?? null;
  const redirectFailed = searchParams.get('redirect_status') === 'failed';

  const [phase, setPhase] = useState<Phase>(redirectFailed ? 'failed' : 'polling');
  const [order, setOrder] = useState<Checkout | null>(null);
  const polls = useRef(0);

  useEffect(() => {
    if (phase !== 'polling' || !token) return;
    let cancelled = false;

    const poll = async () => {
      polls.current += 1;
      try {
        const res = await client.getCheckout(token);
        if (cancelled) return;
        if (res.checkout.status === 'completed') {
          setOrder(res.checkout);
          setPhase('completed');
          return;
        }
        if (res.checkout.status === 'expired') {
          setPhase('failed');
          return;
        }
      } catch {
        // Transient error — keep polling until the cap.
      }
      if (!cancelled) {
        if (polls.current >= MAX_POLLS) setPhase('timeout');
        else timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    let timer = window.setTimeout(poll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phase, token, client]);

  // Once the order is confirmed, forget the cart's checkout token so the
  // next visit starts a fresh cart.
  useEffect(() => {
    if (phase === 'completed' && cartCheckout && cartCheckout.token === token) {
      clear();
    }
  }, [phase, cartCheckout, token, clear]);

  if (!token) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'flex-start', maxWidth: 560, mx: 'auto', mt: 4 }}>
        <Typography variant="h5" component="h1">
          Order status
        </Typography>
        <Typography color="text.secondary">We couldn't find an order to show.</Typography>
        <Link component={RouterLink} to="/">
          Back to the catalog
        </Link>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start', maxWidth: 560, mx: 'auto', mt: 4 }}>
      {phase === 'polling' && (
        <Box sx={{ alignSelf: 'center' }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">Confirming your payment…</Typography>
          </Stack>
        </Box>
      )}

      {phase === 'completed' && order && (
        <>
          <Typography variant="h5" component="h1">
            Thank you for your order!
          </Typography>
          <Typography>
            Your payment of{' '}
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {money(order.total_cents)}
            </Typography>{' '}
            was received.
            {order.email && <> A receipt is on its way to {order.email}.</>}
          </Typography>
          <Button variant="contained" component={RouterLink} to="/">
            Continue shopping
          </Button>
        </>
      )}

      {phase === 'failed' && (
        <>
          <Typography variant="h5" component="h1">
            Payment not completed
          </Typography>
          <Alert severity="error" sx={{ alignSelf: 'stretch' }}>
            Your payment didn't go through, or the checkout expired.
          </Alert>
          <Button variant="contained" component={RouterLink} to="/checkout">
            Try again
          </Button>
        </>
      )}

      {phase === 'timeout' && (
        <>
          <Typography variant="h5" component="h1">
            Payment received — order pending
          </Typography>
          <Typography color="text.secondary">
            We're still confirming your order. If you were charged, you'll receive a receipt by
            email shortly.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              polls.current = 0;
              setPhase('polling');
            }}
          >
            Check again
          </Button>
        </>
      )}
    </Stack>
  );
}
