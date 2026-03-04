import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import { ThemeProvider } from './components/theme-provider'
import { AccentProvider } from './components/accent-provider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AccentProvider>
        <Toaster position="bottom-right" theme="dark" closeButton richColors />
        <App />
      </AccentProvider>
    </ThemeProvider>
  </React.StrictMode>,
)