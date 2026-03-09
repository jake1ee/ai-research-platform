'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, SplitSquareHorizontal, History,
  Settings, LogOut, User, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';

const NAV_ITEMS = [
  { href: '/Dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/compare',   label: 'Compare',    icon: SplitSquareHorizontal },
  { href: '/history',   label: 'History',    icon: History },
  { href: '/settings',  label: 'Settings',   icon: Settings },
];

const PLAN_STYLES: Record<string, string> = {
  free:       'bg-zinc-700 text-zinc-300',
  pro:        'bg-violet-600/30 text-violet-300',
  enterprise: 'bg-amber-500/20 text-amber-300',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">

      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-5">
        <Logo className="h-6 text-white" />
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname.toLowerCase() === href.toLowerCase() ||
            (href !== '/' && pathname.toLowerCase().startsWith(href.toLowerCase()));

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-violet-600/15 text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? 'text-violet-400' : 'text-zinc-500'}`}
              />
              {label}
              {active && (
                <ChevronRight className="ml-auto h-3 w-3 text-violet-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-800 p-3 space-y-1">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 transition-colors"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-200">
              {user?.email ?? 'Guest'}
            </p>
          </div>
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
        </Link>

        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-800/70 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
