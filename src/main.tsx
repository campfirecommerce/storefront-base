import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { StoreThemeProvider } from './context/StoreThemeProvider';
import { CartProvider } from './context/CartContext';
import { App } from './App';
// Self-hosted Roboto for MUI's default typography.
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* StoreProvider sits above the MUI theme provider so the theme can
          pick up store branding (primary color) once settings load. */}
      <StoreProvider>
        <StoreThemeProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </StoreThemeProvider>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
