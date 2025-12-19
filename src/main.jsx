import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// initialize theme on page load
const initializeTheme = () => {
  const themeKey = 'portfolio-tracker-theme';
  const savedTheme = localStorage.getItem(themeKey);
  const root = document.documentElement;
  
  if (savedTheme === 'light') {
    root.classList.add('light-mode');
    root.classList.remove('dark-mode');
  } else {
    root.classList.add('dark-mode');
    root.classList.remove('light-mode');
  }
};

initializeTheme();

// create a query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,   // 10 minutes - cache garbage collection
      retry: 2,                  // retry failed requests twice
      refetchOnWindowFocus: true, // refresh when user returns to tab
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#121214',
              color: '#ededed',
              border: '1px solid rgba(39, 39, 42, 0.4)',
              fontSize: '14px',
              textAlign: 'center',
              padding: '12px 16px',
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
    </QueryClientProvider>
  </StrictMode>,
)
