'use client'

import { LayoutGrid } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Logo */}
      <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-8 shadow-lg animate-pulse">
        <LayoutGrid className="w-7 h-7 text-white" />
      </div>

      {/* Animated bar */}
      <div className="w-48 h-1 bg-zinc-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-black rounded-full animate-loading-bar" />
      </div>

      <p className="text-sm text-zinc-400 tracking-wide">{message}</p>

      <style>{`
        @keyframes loading-bar {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
