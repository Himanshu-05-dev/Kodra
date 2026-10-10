import React, { useState, useEffect } from 'react';
import { X, CreditCard, Sparkles, ExternalLink, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { UsageMeter } from './UsageMeter.jsx';
import { api } from '../../services/api.js';

export function BillingModal({ isOpen, onClose, onOpenUpgradeModal }) {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBillingUsage();
      setUsageData(data);
    } catch (err) {
      setError(err.message || 'Failed to load usage telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const returnUrl = window.location.href;
      const portal = await api.createBillingPortal({ returnUrl });
      if (portal?.url) {
        window.location.href = portal.url;
      }
    } catch (err) {
      setError(err.message || 'Could not open customer portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isPro = usageData?.plan === 'pro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0d0f17] border border-white/10 shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-64 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Usage & Billing Management</h2>
              <p className="text-xs text-ide-muted">Resource quotas and subscription controls</p>
            </div>
          </div>

          <button
            onClick={fetchUsage}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh Usage Telemetry"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white capitalize">
                {isPro ? 'Kodra Pro Plan' : 'Free Community Plan'}
              </span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                isPro
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
                {usageData?.plan || 'Free'}
              </span>
            </div>
            <div className="text-xs text-ide-muted mt-1">
              {isPro
                ? 'Unlimited autonomous loops, 2M tokens/mo, 200 compute hrs'
                : 'Limited to 50k tokens and 10 sandbox compute hours monthly'}
            </div>
          </div>

          <div>
            {isPro ? (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <span>Manage in Stripe</span>
                <ExternalLink size={12} />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenUpgradeModal?.();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-semibold shadow-glow-sm flex items-center gap-1.5 transition-all"
              >
                <Zap size={13} />
                <span>Upgrade to Pro</span>
              </button>
            )}
          </div>
        </div>

        {/* Resource Consumption Meter */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Current Billing Cycle Resource Quotas
          </div>
          <UsageMeter
            usageData={usageData}
            onUpgradeClick={() => {
              onClose();
              onOpenUpgradeModal?.();
            }}
          />
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-ide-muted">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck size={14} />
            <span>Monthly quota auto-renews on the 1st of each month</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
