import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'

console.log('Main.tsx executing...');
const container = document.getElementById('root');
console.log('Root container found:', !!container);

createRoot(container!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
)
console.log('Render called');

