import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Main.tsx is executing');

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

  console.log('Rendering App component...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('Render call completed');
} catch (error) {
  console.error('Initial render failed:', error);
}
