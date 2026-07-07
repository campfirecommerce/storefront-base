import { useMemo, type ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useStore } from './StoreContext';

/**
 * MUI ThemeProvider that applies store branding. The store loads async, so
 * this re-renders with a primary palette derived from settings.primary_color
 * once it arrives; until then MUI defaults apply.
 */
export function StoreThemeProvider({ children }: { children: ReactNode }) {
  const { store } = useStore();
  const primary = store?.settings?.primary_color;

  const theme = useMemo(() => {
    if (primary) {
      try {
        return createTheme({ palette: { primary: { main: primary } } });
      } catch {
        // Unparseable color — fall back to the default theme.
      }
    }
    return createTheme();
  }, [primary]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
