import { useMemo, useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Grid, Link, Stack, TextField, Typography } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { StoreApiError, type Address } from '@campfirecommerce/store-client';
import { useStore } from '../lib/StoreContext';
import { useCart } from '../lib/CartContext';

export function CheckoutPage() {
  const { store, money } = useStore();
  const { checkout, busy, setContact, pay } = useCart();

  const [email, setEmail] = useState(checkout?.email ?? '');
  const [address, setAddress] = useState<Address>({
    name: checkout?.shipping_address.name ?? '',
    line1: checkout?.shipping_address.line1 ?? '',
    line2: checkout?.shipping_address.line2 ?? '',
    city: checkout?.shipping_address.city ?? '',
    region: checkout?.shipping_address.region ?? '',
    postal_code: checkout?.shipping_address.postal_code ?? '',
    country: checkout?.shipping_address.country || 'US',
  });
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Load Stripe.js once, with the publishable key the backend serves at
  // runtime (GET /storefront/store), so clones need no rebuild per store.
  // Stores on Stripe Connect take direct charges on their own account, so
  // Stripe.js must initialize with that account for the intent to resolve.
  const stripePromise = useMemo(() => {
    const key = store?.stripe_publishable_key;
    if (!key) return null;
    const account = store?.stripe_account_id;
    return loadStripe(key, account ? { stripeAccount: account } : undefined);
  }, [store]);

  const requiresShipping =
    checkout?.line_items.some((li) => li.requires_shipping) ?? false;

  if (!checkout || checkout.line_items.length === 0) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'flex-start', mt: 4 }}>
        <Typography variant="h5" component="h1">
          Checkout
        </Typography>
        <Typography color="text.secondary">Your cart is empty.</Typography>
        <Link component={RouterLink} to="/">
          Browse the catalog
        </Link>
      </Stack>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await setContact(email.trim(), requiresShipping ? address : undefined);
      const res = await pay();
      setClientSecret(res.client_secret);
    } catch (err) {
      setError(
        err instanceof StoreApiError ? err.message : 'Could not start payment, please try again',
      );
    }
  };

  const field = (key: keyof Address) => ({
    value: address[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddress((a) => ({ ...a, [key]: e.target.value })),
  });

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Typography variant="h5" component="h1">
        Checkout
      </Typography>
      <Typography color="text.secondary">
        {checkout.line_items.reduce((n, li) => n + li.quantity, 0)} items ·{' '}
        {money(checkout.total_cents)}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      {!clientSecret ? (
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {requiresShipping && (
              <>
                <Typography variant="h6" component="h2" sx={{ mt: 1 }}>
                  Shipping address
                </Typography>
                <TextField label="Full name" required {...field('name')} />
                <TextField label="Address line 1" required {...field('line1')} />
                <TextField label="Address line 2" {...field('line2')} />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField label="City" required fullWidth {...field('city')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="State / Region" fullWidth {...field('region')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="Postal code" required fullWidth {...field('postal_code')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="Country" required fullWidth {...field('country')} />
                  </Grid>
                </Grid>
              </>
            )}

            <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
              <Button type="submit" variant="contained" loading={busy}>
                Continue to payment
              </Button>
            </Stack>
          </Stack>
        </form>
      ) : !stripePromise ? (
        <Alert severity="error">Payments are not configured for this store.</Alert>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm checkoutToken={checkout.token} />
        </Elements>
      )}
    </Stack>
  );
}

function PaymentForm({ checkoutToken }: { checkoutToken: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe redirects here after payment (with its own query params
        // appended); /thanks polls the checkout until the webhook completes it.
        return_url: `${window.location.origin}/thanks?token=${encodeURIComponent(checkoutToken)}`,
      },
    });
    // confirmPayment only returns on failure; success navigates away.
    setSubmitting(false);
    setError(result.error.message ?? 'Payment failed, please try again');
  };

  return (
    <Stack spacing={2}>
      <PaymentElement />
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handlePay}
          disabled={!stripe || !elements}
          loading={submitting}
        >
          Pay now
        </Button>
      </Stack>
    </Stack>
  );
}
