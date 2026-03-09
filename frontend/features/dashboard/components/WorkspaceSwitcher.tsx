'use client';

/**
 * WorkspaceSwitcher
 * -----------------
 * Dropdown to switch between workspaces. Shows:
 *  • Workspace name + plan badge + member count
 *  • User's role in each workspace
 *  • "Create workspace" option at bottom (Enterprise)
 * Hides team workspaces for Free plan users.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Check, Plus, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  role: 'admin' | 'engineer' | 'viewer';
  memberCount: number;
  slug?: string;
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  current: Workspace;
  onSwitch: (workspace: Workspace) => void;
  onCreateNew?: () => void;
}

// ─── Plan badge colours ───────────────────────────────────────────────────────

const PLAN_STYLES: Record<Workspace['plan'], string> = {
  free:       'bg-zinc-800 text-zinc-400',
  pro:        'bg-violet-500/20 text-violet-400',
  enterprise: 'bg-amber-500/20 text-amber-400',
};

const ROLE_STYLES: Record<Workspace['role'], string> = {
  admin:    'text-violet-400',
  engineer: 'text-blue-400',
  viewer:   'text-zinc-500',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceSwitcher({
  workspaces,
  current,
  onSwitch,
  onCreateNew,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
      >
        <Building2 className="h-4 w-4 text-violet-400" />
        <span className="max-w-[140px] truncate font-medium">{current.name}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${PLAN_STYLES[current.plan]}`}>
          {current.plan}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="p-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { onSwitch(ws); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${
                  ws.id === current.id ? 'bg-zinc-800' : ''
                }`}
              >
                {/* Avatar placeholder (first letter) */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-bold text-violet-300">
                  {ws.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-zinc-100">
                      {ws.name}
                    </span>
                    <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${PLAN_STYLES[ws.plan]}`}>
                      {ws.plan}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3 w-3 text-zinc-600" />
                    <span className="text-xs text-zinc-500">{ws.memberCount} members</span>
                    <span className={`text-xs font-medium ${ROLE_STYLES[ws.role]}`}>
                      · {ws.role}
                    </span>
                  </div>
                </div>

                {ws.id === current.id && (
                  <Check className="h-4 w-4 flex-shrink-0 text-violet-400" />
                )}
              </button>
            ))}
          </div>

          {/* Create new workspace (Pro/Enterprise only) */}
          {onCreateNew && (
            <>
              <div className="mx-3 border-t border-zinc-800" />
              <div className="p-1">
                <button
                  onClick={() => { onCreateNew(); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  Create new workspace
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
