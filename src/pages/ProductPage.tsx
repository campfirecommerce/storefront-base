import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { StoreApiError, type StorefrontProduct } from '@campfirecommerce/store-client';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';

const IMAGE_FALLBACK = 'https://placehold.co/600x450?text=No+image';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { client, money } = useStore();
  const { addItem, busy } = useCart();

  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    client
      .getProduct(slug)
      .then((res) => {
        if (cancelled) return;
        setProduct(res.product);
        setVariantId(res.product.variants[0] ? String(res.product.variants[0].id) : null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load product');
      });
    return () => {
      cancelled = true;
    };
  }, [client, slug]);

  const variant = useMemo(
    () => product?.variants.find((v) => String(v.id) === variantId) ?? null,
    [product, variantId],
  );

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Product unavailable</AlertTitle>
        {error} —{' '}
        <Link component={RouterLink} to="/">
          back to the catalog
        </Link>
      </Alert>
    );
  }
  if (!product) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const soldOut = variant !== null && variant.available <= 0;
  const onSale = variant !== null && variant.compare_at_cents > variant.price_cents;

  const handleAdd = async () => {
    if (!variant) return;
    setAdded(false);
    setAddError(null);
    try {
      await addItem(variant.id, Math.max(1, Number(quantity) || 1));
      setAdded(true);
    } catch (err) {
      setAddError(
        err instanceof StoreApiError ? err.message : 'Could not add to cart, please try again',
      );
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          component="img"
          src={product.images?.[0] ?? IMAGE_FALLBACK}
          alt={product.title}
          onError={(e) => {
            if (e.currentTarget.src !== IMAGE_FALLBACK) {
              e.currentTarget.src = IMAGE_FALLBACK;
            }
          }}
          sx={{ width: '100%', display: 'block', borderRadius: 2 }}
        />
        {(product.images?.length ?? 0) > 1 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: 'auto' }}>
            {product.images!.slice(1).map((src) => (
              <Box
                key={src}
                component="img"
                src={src}
                alt={product.title}
                sx={{ width: 72, height: 72, flexShrink: 0, objectFit: 'cover', borderRadius: 1 }}
              />
            ))}
          </Stack>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <div>
            <Typography variant="h4" component="h1">
              {product.title}
            </Typography>
            {(product.tags?.length ?? 0) > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {product.tags!.map((t) => (
                  <Chip key={t} label={t} size="small" color="primary" variant="outlined" />
                ))}
              </Box>
            )}
          </div>

          {variant && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
                {money(variant.price_cents)}
              </Typography>
              {onSale && (
                <Typography color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                  {money(variant.compare_at_cents)}
                </Typography>
              )}
              {soldOut && <Chip label="Sold out" size="small" />}
            </Stack>
          )}

          {product.variants.length > 1 && (
            <TextField
              select
              label="Option"
              value={variantId ?? ''}
              onChange={(e) => setVariantId(e.target.value)}
              sx={{ minWidth: 240 }}
            >
              {product.variants.map((v) => (
                <MenuItem key={v.id} value={String(v.id)}>
                  {v.title || v.sku || `#${v.id}`} — {money(v.price_cents)}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            slotProps={{
              htmlInput: { min: 1, max: variant?.available || undefined },
            }}
            sx={{ width: 120 }}
          />

          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!variant || soldOut}
            loading={busy}
          >
            {soldOut ? 'Sold out' : 'Add to cart'}
          </Button>

          {added && (
            <Alert severity="success" sx={{ alignSelf: 'stretch' }}>
              Added to cart.{' '}
              <Link component={RouterLink} to="/cart">
                View cart
              </Link>
            </Alert>
          )}
          {addError && (
            <Alert severity="error" sx={{ alignSelf: 'stretch' }}>
              {addError}
            </Alert>
          )}

          {product.description && (
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{product.description}</Typography>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
