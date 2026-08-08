import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './style.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          },
          success: {
            iconTheme: { primary: '#00a88f', secondary: '#fff' },
            style: {
              background: '#1f2937',
              color: '#f9fafb',
            },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
            style: {
              background: '#1f2937',
              color: '#f9fafb',
            },
          },
        }}
      />
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
