import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { db } from './lib/db'

// Expose db for testing
if (typeof window !== 'undefined') {
  (window as any).__CANOPY_DB__ = db;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
