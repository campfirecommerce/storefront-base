import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Grid,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ProductListResponse, StorefrontProduct } from '@campfirecommerce/store-client';
import { useStore } from '../context/StoreContext';

const PER_PAGE = 12;
const IMAGE_FALLBACK = 'https://placehold.co/400x300?text=No+image';

function priceLabel(product: StorefrontProduct, money: (cents: number) => string): string {
  if (product.variants.length === 0) return '';
  const prices = product.variants.map((v) => v.price_cents);
  const min = Math.min(...prices);
  return Math.max(...prices) > min ? `From ${money(min)}` : money(min);
}

export function CatalogPage() {
  const { client, money } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [search, setSearch] = useState(query);
  const [result, setResult] = useState<ProductListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    client
      .listProducts({
        query: query || undefined,
        tag: tag || undefined,
        page,
        per_page: PER_PAGE,
      })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products');
      });
    return () => {
      cancelled = true;
    };
  }, [client, query, tag, page]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  // Tag filter options: tags seen on the current page plus the active tag.
  const tags = useMemo(() => {
    const set = new Set<string>();
    if (tag) set.add(tag);
    for (const p of result?.products ?? []) {
      for (const t of p.tags ?? []) set.add(t);
    }
    return [...set].sort();
  }, [result, tag]);

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Could not load products</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam('query', search.trim());
        }}
      >
        <TextField
          placeholder="Search products…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: '100%', maxWidth: 360 }}
        />
      </form>

      {tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tags.map((t) => (
            <Chip
              key={t}
              label={t}
              color={t === tag ? 'primary' : 'default'}
              variant={t === tag ? 'filled' : 'outlined'}
              onClick={() => setParam('tag', t === tag ? '' : t)}
            />
          ))}
        </Box>
      )}

      {!result ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : result.products.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4 }}>
          No products found.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {result.products.map((product) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea
                  component={RouterLink}
                  to={`/p/${product.slug}`}
                  sx={{ height: '100%' }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.images?.[0] ?? IMAGE_FALLBACK}
                    alt={product.title}
                    onError={(e) => {
                      if (e.currentTarget.src !== IMAGE_FALLBACK) {
                        e.currentTarget.src = IMAGE_FALLBACK;
                      }
                    }}
                  />
                  <CardContent>
                    <Typography noWrap sx={{ fontWeight: 500 }}>
                      {product.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {priceLabel(product, money)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {result && result.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={result.total_pages}
            page={page}
            onChange={(_, p) => setParam('page', String(p))}
          />
        </Box>
      )}
    </Stack>
  );
}
