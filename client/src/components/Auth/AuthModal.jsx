import React, { useState } from 'react';
import {
  Code2,
  X,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  UserCheck,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export function AuthModal({ isOpen, onClose }) {
  const {
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    loginAsDev,
    isFirebaseConfigured,
    error,
    clearError
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please provide both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    clearError();
    try {
      setIsSubmitting(true);
      await loginWithGoogle();
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Google sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDevLogin = (name, roleEmail, uid) => {
    loginAsDev(uid, roleEmail, name);
    onClose();
  };

  const currentError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-[1px] mb-3 shadow-glow-sm">
            <div className="w-full h-full bg-[#0a0c14] rounded-[11px] flex items-center justify-center text-white">
              <Code2 size={24} className="text-purple-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back to Kodra' : 'Create Your Kodra Account'}
          </h2>
          <p className="text-xs text-ide-muted mt-1">
            Autonomous Cloud IDE & AI Pair Programmer
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-5">
          <button
            onClick={() => { setMode('login'); setLocalError(null); clearError(); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-ide-muted hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setLocalError(null); clearError(); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-ide-muted hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {currentError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{currentError}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        {isFirebaseConfigured ? (
          <button
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2.5 transition-all hover:border-purple-500/40 mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        ) : null}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-ide-muted mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-3 text-ide-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@kodra.ai"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-ide-muted focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ide-muted mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-3 text-ide-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-ide-muted focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm flex items-center justify-center gap-2 transition-all mt-2"
          >
            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Multi-User Scoping Test Switcher (Quick Dev Logins) */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] uppercase font-semibold text-ide-muted tracking-wider">
              Developer Fast Switch (Multi-Tenant Demo)
            </span>
            <ShieldCheck size={12} className="text-emerald-400" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDevLogin('Alice Rivers', 'alice@kodra.dev', 'user-alice')}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                A
              </div>
              <div className="truncate">
                <div className="text-[11px] font-medium text-white truncate">Alice</div>
                <div className="text-[9px] text-ide-muted truncate">user-alice</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDevLogin('Bob Vance', 'bob@kodra.dev', 'user-bob')}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-colors flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center">
                B
              </div>
              <div className="truncate">
                <div className="text-[11px] font-medium text-white truncate">Bob</div>
                <div className="text-[9px] text-ide-muted truncate">user-bob</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
