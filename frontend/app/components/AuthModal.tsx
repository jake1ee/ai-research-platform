import React, { useState, useEffect } from 'react';
import { X, Github } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from './AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialView = 'signin' }: AuthModalProps) {
  const { login } = useAuth();
  const [view, setView] = useState<'signin' | 'signup'>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setEmail('');
      setPassword('');
      setName('');
      setEmailError('');
      setPasswordError('');
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const switchView = (v: 'signin' | 'signup') => {
    setView(v);
    setEmailError('');
    setPasswordError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (isValid) {
      login(email, view === 'signup' ? name : '');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
          }
        `}</style>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Use py-6 instead of p-8, and tighter gaps on smaller screens */}
        <div className="px-8 py-6">
          {/* Header — reduced mb */}
          <div className="flex flex-col items-center gap-2 mb-5">
            <Logo className="h-7 text-white" />
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {view === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {view === 'signin' ? (
                  <>
                    No account?{' '}
                    <button onClick={() => switchView('signup')} className="font-medium text-white hover:text-indigo-400 transition-colors underline underline-offset-2">
                      Start your free trial
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button onClick={() => switchView('signin')} className="font-medium text-white hover:text-indigo-400 transition-colors underline underline-offset-2">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              className="flex justify-center items-center gap-2 py-2.5 px-4 border border-white/10 rounded-xl bg-[#0A0A0A] text-sm font-medium text-white hover:bg-white/5 hover:border-white/20 transition-all"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex justify-center items-center gap-2 py-2.5 px-4 border border-white/10 rounded-xl bg-[#0A0A0A] text-sm font-medium text-white hover:bg-white/5 hover:border-white/20 transition-all"
            >
              <Github className="w-4 h-4 shrink-0" />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-xs text-zinc-500 shrink-0">or continue with email</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {view === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-[#0A0A0A] border border-white/10 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                className={`block w-full rounded-xl bg-[#0A0A0A] border px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 text-sm transition-colors ${
                  emailError
                    ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500'
                    : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                placeholder="you@example.com"
              />
              {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">Password</label>
                {view === 'signin' && (
                  <a href="#" className="text-xs text-zinc-500 hover:text-white transition-colors">Forgot password?</a>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                className={`block w-full rounded-xl bg-[#0A0A0A] border px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 text-sm transition-colors ${
                  passwordError
                    ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500'
                    : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                placeholder="••••••••"
              />
              {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
              {view === 'signup' && (
                <p className="mt-1 text-xs text-zinc-600">Must be at least 8 characters.</p>
              )}
            </div>

            {view === 'signin' && (
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/10 bg-[#0A0A0A] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-[#141414]"
                />
                <label htmlFor="remember-me" className="text-sm text-zinc-400 select-none cursor-pointer">Remember me</label>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-full text-sm font-semibold text-black bg-white hover:bg-zinc-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#141414] focus:ring-white transition-all mt-1"
            >
              {view === 'signin' ? 'Sign in' : 'Start 7-Day Free Trial'}
            </button>
          </form>

          {/* Footer note */}
          {view === 'signup' && (
            <p className="mt-3 text-center text-xs text-zinc-600">
              By signing up, you agree to our{' '}
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}