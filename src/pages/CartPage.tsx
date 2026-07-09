import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StoreApiError } from '@campfirecommerce/store-client';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';

export function CartPage() {
  const { store, money } = useStore();
  const { checkout, busy, setQuantity, removeItem, pay } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const mutate = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof StoreApiError ? err.message : 'Could not update the cart');
    }
  };

  // Hand off to Stripe-hosted Checkout; Stripe collects email, shipping
  // address and payment, then returns the customer to /thanks.
  const handleCheckout = async () => {
    setError(null);
    try {
      const res = await pay();
      window.location.assign(res.url);
    } catch (err) {
      // 410 = this checkout was already paid; show the confirmation.
      if (err instanceof StoreApiError && err.status === 410 && checkout) {
        navigate(`/thanks?token=${encodeURIComponent(checkout.token)}`);
        return;
      }
      setError(
        err instanceof StoreApiError ? err.message : 'Could not start checkout, please try again',
      );
    }
  };

  if (!checkout || checkout.line_items.length === 0) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'flex-start', mt: 4 }}>
        <Typography variant="h5" component="h1">
          Your cart
        </Typography>
        <Typography color="text.secondary">Your cart is empty.</Typography>
        <Link component={RouterLink} to="/">
          Browse the catalog
        </Link>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" component="h1">
        Your cart
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell>Price</TableCell>
            <TableCell sx={{ width: 110 }}>Qty</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell sx={{ width: 40 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {checkout.line_items.map((li) => (
            <TableRow key={li.variant_id}>
              <TableCell>
                <Typography sx={{ fontWeight: 500 }}>{li.title}</Typography>
                {li.variant_title && (
                  <Typography variant="body2" color="text.secondary">
                    {li.variant_title}
                  </Typography>
                )}
              </TableCell>
              <TableCell>{money(li.price_cents)}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  size="small"
                  value={li.quantity}
                  disabled={busy}
                  slotProps={{ htmlInput: { min: 1, 'aria-label': 'Quantity' } }}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    if (Number.isFinite(qty) && qty >= 1 && qty !== li.quantity) {
                      void mutate(() => setQuantity(li.variant_id, qty));
                    }
                  }}
                />
              </TableCell>
              <TableCell align="right">{money(li.price_cents * li.quantity)}</TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  aria-label="Remove item"
                  disabled={busy}
                  onClick={() => void mutate(() => removeItem(li.variant_id))}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
        <Typography variant="body2">Subtotal: {money(checkout.subtotal_cents)}</Typography>
        {checkout.shipping_cents > 0 && (
          <Typography variant="body2">Shipping: {money(checkout.shipping_cents)}</Typography>
        )}
        {checkout.tax_cents > 0 && (
          <Typography variant="body2">Tax: {money(checkout.tax_cents)}</Typography>
        )}
        <Typography sx={{ fontWeight: 600 }}>Total: {money(checkout.total_cents)}</Typography>
      </Stack>

      {store && !store.checkout_enabled && (
        <Alert severity="info">
          This store isn't accepting payments yet, so checkout is temporarily unavailable.
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button variant="outlined" component={RouterLink} to="/">
          Keep shopping
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleCheckout()}
          disabled={busy || !store?.checkout_enabled}
        >
          Check out
        </Button>
      </Stack>
    </Stack>
  );
}
