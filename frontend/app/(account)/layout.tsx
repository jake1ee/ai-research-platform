import { Providers } from "../providers";

// Authenticated area: always rendered per-request (needs Supabase env at runtime, not build time).
export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
