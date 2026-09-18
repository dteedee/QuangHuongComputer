import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css' // also @imports styles/tokens.css + styles/base.css (W1-7) — do not re-import those here
import './dark-theme.css'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import { queryClient } from './lib/query-client'
import { MotionProvider } from './components/motion'
import { AudienceProvider } from './context/AudienceContext'
import { SystemConfigProvider } from './context/SystemConfigContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import { ComparisonProvider } from './context/ComparisonContext'

// NOTE (integration-requests-w1.md): `App.tsx` (W1-8) still creates its own
// `QueryClient` + `QueryClientProvider` and its own copies of every provider
// below. Until W1-8 removes them, App's inner copies win for everything
// rendered inside <App/> (nearest-ancestor context resolution) — this is the
// intentional wave-1 split ("providers move to main.tsx, App.tsx becomes
// routes-only") landing in two parallel tracks; the gate reconciles them.
// `WishlistProvider` has no inner counterpart today (it was never mounted at
// all — see the integration request), so mounting it here is a strict
// improvement: `useWishlist()` no longer throws.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AudienceProvider>
            <SystemConfigProvider>
              <ConfirmProvider>
                <AuthProvider>
                  <ThemeProvider>
                    <CartProvider>
                      <WishlistProvider>
                        <ComparisonProvider>
                          <MotionProvider>
                            <App />
                          </MotionProvider>
                        </ComparisonProvider>
                      </WishlistProvider>
                    </CartProvider>
                  </ThemeProvider>
                </AuthProvider>
              </ConfirmProvider>
            </SystemConfigProvider>
          </AudienceProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
)
