import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'

// Global error handler
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error('Global error caught:', msg, error);
  
  // Don't show error details in production
  if (process.env.NODE_ENV === 'production') {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="padding: 40px; text-align: center; font-family: system-ui;">
        <h1 style="color: #d70018;">Đã có lỗi xảy ra</h1>
        <p>Vui lòng tải lại trang hoặc liên hệ hỗ trợ.</p>
        <button onclick="window.location.reload()" 
          style="padding: 12px 24px; background: #d70018; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          Tải lại trang
        </button>
      </div>`;
    }
  }
  
  return false;
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Prevent default browser error logging in production
  if (process.env.NODE_ENV === 'production') {
    event.preventDefault();
  }
});

window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error('Frontend Crash:', msg, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif; background: white; border: 5px solid red;">
            <h1>Frontend Error</h1>
            <pre>${msg}</pre>
            <p>${error?.stack || ''}</p>
        </div>`;
  }
  return false;
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('Initial render failed:', error);
}
