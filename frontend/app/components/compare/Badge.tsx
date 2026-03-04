'use client';

/**
 * Badge
 * -----
 * Compact pill for model performance badges.
 * Variants: fastest | cheapest | best_quality | valid_json | most_tokens
 */

import { Zap, DollarSign, Star, CheckCircle2, Hash } from 'lucide-react';

export type BadgeVariant = 'fastest' | 'cheapest' | 'best_quality' | 'valid_json' | 'most_tokens';

const BADGE_CONFIG: Record<
  BadgeVariant,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  fastest:      { label: 'Fastest',      icon: <Zap className="h-2.5 w-2.5" />,         cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  cheapest:     { label: 'Cheapest',     icon: <DollarSign className="h-2.5 w-2.5" />,   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  best_quality: { label: 'Best Quality', icon: <Star className="h-2.5 w-2.5" />,         cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  valid_json:   { label: 'Valid JSON',   icon: <CheckCircle2 className="h-2.5 w-2.5" />, cls: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  most_tokens:  { label: 'Most Tokens',  icon: <Hash className="h-2.5 w-2.5" />,         cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

interface BadgeProps {
  variant: BadgeVariant;
  /** Smaller pill with no label text */
  compact?: boolean;
}

export function Badge({ variant, compact = false }: BadgeProps) {
  const { label, icon, cls } = BADGE_CONFIG[variant];
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {icon}
      {!compact && label}
    </span>
  );
}
