'use client'

import { AuthProvider, useAuth } from '@/app/components/AuthContext'
import LoadingScreen from '@/app/components/LoadingScreen'

function AppShell({ children }: { children: React.ReactNode }) {
  const { isInitializing } = useAuth()
  if (isInitializing) return <LoadingScreen message="Starting up…" />
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
