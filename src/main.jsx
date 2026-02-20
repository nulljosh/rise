import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Missing #root element in index.html');
  }

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (err) {
  console.error('Failed to render app:', err);
  document.body.innerHTML = `<div style="padding:40px;background:#1a1a1a;color:#ff6b6b;font-family:monospace"><h1>Render Error</h1><pre>${err.stack}</pre></div>`;
}
