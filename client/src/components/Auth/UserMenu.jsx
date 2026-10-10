import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  LogIn,
  Shield,
  ChevronDown,
  Sparkles,
  Users,
  Check,
  CreditCard,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export function UserMenu({ onOpenAuthModal, onOpenBillingModal, onOpenUpgradeModal }) {
  const { user, isAuthenticated, signOut, loginAsDev } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={onOpenAuthModal}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium shadow-glow-sm transition-all active:scale-95"
      >
        <LogIn size={13} />
        <span>Sign In</span>
      </button>
    );
  }

  const initial = (user.displayName || user.email || 'U')[0].toUpperCase();

  const devProfiles = [
    { uid: 'user-alice', name: 'Alice Rivers', email: 'alice@kodra.dev', color: 'from-purple-500 to-indigo-500' },
    { uid: 'user-bob', name: 'Bob Vance', email: 'bob@kodra.dev', color: 'from-cyan-500 to-blue-500' },
    { uid: 'user-carol', name: 'Carol Danvers', email: 'carol@kodra.dev', color: 'from-pink-500 to-rose-500' }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-slate-300 hover:text-white"
        title={user.email}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-purple-500/40"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
            {initial}
          </div>
        )}
        <span className="text-xs font-medium max-w-[100px] truncate hidden sm:inline">
          {user.displayName || user.email?.split('@')[0]}
        </span>
        <ChevronDown size={11} className="text-ide-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 glass-dropdown rounded-xl shadow-2xl py-2 z-50 text-xs border border-white/10 animate-in fade-in zoom-in-95 duration-100 divide-y divide-white/5">
          {/* User Info Header */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                  {initial}
                </div>
              )}
              <div className="overflow-hidden">
                <div className="font-semibold text-white truncate text-xs">
                  {user.displayName}
                </div>
                <div className="text-[10px] text-ide-muted truncate">
                  {user.email || 'No email associated'}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-purple-300 border border-purple-500/20 truncate max-w-[140px]">
                UID: {user.uid}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Shield size={10} />
                <span>Active</span>
              </span>
            </div>
          </div>

          {/* Quick Tenant Switcher (Demo Multi-User Scoping) */}
          <div className="px-2 py-2">
            <div className="px-2 py-1 text-[10px] font-semibold text-ide-muted uppercase tracking-wider flex items-center gap-1.5">
              <Users size={11} className="text-purple-400" />
              <span>Switch Tenant Profile</span>
            </div>

            <div className="mt-1 space-y-1">
              {devProfiles.map((p) => {
                const isSelected = user.uid === p.uid;
                return (
                  <button
                    key={p.uid}
                    onClick={() => {
                      loginAsDev(p.uid, p.email, p.name);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-tr ${p.color} text-white text-[9px] font-bold flex items-center justify-center`}>
                        {p.name[0]}
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] font-medium">{p.name}</span>
                        <span className="text-[9px] text-ide-muted ml-1.5">({p.uid})</span>
                      </div>
                    </div>
                    {isSelected && <Check size={12} className="text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1 space-y-0.5">
            {onOpenBillingModal && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenBillingModal();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard size={13} className="text-cyan-400" />
                  <span>Usage & Quotas</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                  Plan
                </span>
              </button>
            )}

            {onOpenUpgradeModal && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenUpgradeModal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gradient-to-r from-purple-500/15 to-indigo-500/15 hover:from-purple-500/25 hover:to-indigo-500/25 text-purple-300 hover:text-white transition-all font-medium"
              >
                <Zap size={13} className="text-purple-400" />
                <span>Upgrade to Pro ($20/mo)</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenAuthModal();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            >
              <Sparkles size={13} className="text-purple-400" />
              <span>Account Settings & OAuth</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
