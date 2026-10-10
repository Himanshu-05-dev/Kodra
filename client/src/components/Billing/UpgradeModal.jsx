import React, { useState } from 'react';
import { X, Check, Sparkles, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

export function UpgradeModal({ isOpen, onClose, onUpgradeSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const returnUrl = window.location.href;
      const session = await api.createCheckout({ returnUrl });

      if (session?.url) {
        // If mock session in dev, complete immediately
        if (session.url.includes('mock=true')) {
          await api.upgradePlanDirect('pro');
          onUpgradeSuccess?.('pro');
          onClose();
        } else {
          // Redirect to real Stripe Checkout hosted page
          window.location.href = session.url;
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize checkout session.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.upgradePlanDirect('pro');
      onUpgradeSuccess?.('pro');
      onClose();
    } catch (err) {
      setError(err.message || 'Upgrade failed.');
    } finally {
      setLoading(false);
    }
  };

  const proFeatures = [
    '2,000,000 monthly AI tokens (40x Free limit)',
    '200 hours sandbox compute runtime',
    'Up to 50 active workspaces & projects',
    'Self-healing autonomous debug loops (15 iterations)',
    'Priority Docker containers with 2GB RAM limits',
    'Custom live preview subdomains & WebSocket HMR',
    'Full Git branching & automated AI commit generation'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e111a] border border-purple-500/30 shadow-2xl p-6 overflow-hidden">
        {/* Neon Glow Accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
            <Sparkles size={12} className="text-purple-400" />
            <span>KODRA PRO TIER</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Unlock Full Autonomous Engineering
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
            Supercharge your developer flow with unlimited AI agent sessions and persistent cloud execution.
          </p>

          <div className="mt-4 flex items-baseline justify-center gap-1.5">
            <span className="text-4xl font-extrabold text-white tracking-tight">$20</span>
            <span className="text-slate-400 text-sm font-medium">/ month</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Features Matrix */}
        <div className="space-y-2.5 mb-6 py-3 border-y border-white/5">
          {proFeatures.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                <Check size={11} />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:brightness-110 active:scale-[0.99] transition-all shadow-glow-purple flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                <Zap size={15} />
                <span>Upgrade with Stripe ($20/mo)</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          <button
            onClick={handleDirectUpgrade}
            disabled={loading}
            className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
          >
            Instant Upgrade (Dev Mode Simulation)
          </button>
        </div>

        <div className="mt-4 text-center">
          <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Shield size={11} />
            <span>Encrypted billing via Stripe • Cancel anytime with one click</span>
          </span>
        </div>
      </div>
    </div>
  );
}
