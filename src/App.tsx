import { useEffect } from 'react';
import { Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  AppBar,
  Badge,
  Box,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Link,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useStore } from './context/StoreContext';
import { useCart } from './context/CartContext';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { ThanksPage } from './pages/ThanksPage';

export function App() {
  const { store, error } = useStore();
  const { itemCount } = useCart();

  useEffect(() => {
    if (store) document.title = store.name;
  }, [store]);

  const settings = store?.settings;
  const hasFooter = Boolean(settings?.about || settings?.support_email);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0 }}
          >
            {settings?.logo_url && (
              <Box
                component="img"
                src={settings.logo_url}
                alt={`${store?.name ?? 'Store'} logo`}
                sx={{ height: 32, display: 'block' }}
              />
            )}
            <Typography variant="h6" component="span" noWrap>
              {store?.name ?? 'Storefront'}
            </Typography>
          </Link>
          <IconButton
            component={RouterLink}
            to="/cart"
            color="inherit"
            aria-label={`Cart, ${itemCount} items`}
          >
            <Badge badgeContent={itemCount} color="error">
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" component="main" sx={{ flexGrow: 1, py: 3 }}>
        {error ? (
          <Alert severity="error" sx={{ mt: 4 }}>
            <AlertTitle>Store unavailable</AlertTitle>
            {error}
          </Alert>
        ) : !store ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/p/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            {/* Payment happens on Stripe-hosted Checkout; old links land on the cart. */}
            <Route path="/checkout" element={<Navigate to="/cart" replace />} />
            <Route path="/thanks" element={<ThanksPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Container>

      {hasFooter && (
        <Container maxWidth="lg" component="footer" sx={{ mt: 4, pb: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={0.5}>
            {settings?.about && (
              <Typography variant="body2" color="text.secondary">
                {settings.about}
              </Typography>
            )}
            {settings?.support_email && (
              <Typography variant="body2" color="text.secondary">
                Support:{' '}
                <Link href={`mailto:${settings.support_email}`}>{settings.support_email}</Link>
              </Typography>
            )}
          </Stack>
        </Container>
      )}
    </Box>
  );
}
