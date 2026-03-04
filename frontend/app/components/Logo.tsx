import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className = "h-8", iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto shrink-0">
        <rect x="8" y="4" width="6" height="24" rx="1.5" fill="#6366F1" />
        <rect x="18" y="14" width="6" height="14" rx="1.5" fill="currentColor" />
        <circle cx="21" cy="7" r="3" fill="currentColor" />
      </svg>
      {!iconOnly && (
        <span className="font-bold tracking-tight text-xl font-sans">
          Inferra
        </span>
      )}
    </div>
  );
}
