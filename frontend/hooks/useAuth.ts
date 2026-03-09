'use client';

/**
 * useAuth – hook that exposes the Supabase Auth context.
 *
 * Wrap your app with <AuthProvider> (in app/providers.tsx) then call this
 * hook in any client component:
 *
 *   const { user, signIn, signOut } = useAuth();
 */

export { useAuth } from '@/app/components/AuthContext';
