import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#121214',
            color: '#ededed',
            border: '1px solid rgba(39, 39, 42, 0.4)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#ededed',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ededed',
            },
          },
        }}
      />
    </ErrorBoundary>
  </StrictMode>,
)
