import React from 'react';
import { Cpu, HardDrive, Sparkles, AlertTriangle, ArrowUpRight } from 'lucide-react';

export function UsageMeter({ usageData, onUpgradeClick, compact = false }) {
  if (!usageData) return null;

  const {
    plan = 'free',
    usage = { tokensUsed: 0, computeHoursUsed: 0, projectCount: 0 },
    limits = { maxTokensMonthly: 50000, maxSandboxHoursMonthly: 10, maxProjects: 3 },
    percentages = { tokens: 0, compute: 0, projects: 0 },
    status = {}
  } = usageData;

  const getBarColor = (pct) => {
    if (pct >= 90) return 'from-rose-500 to-red-600 shadow-rose-500/30';
    if (pct >= 75) return 'from-amber-400 to-amber-600 shadow-amber-500/20';
    return 'from-purple-500 via-indigo-500 to-cyan-400 shadow-purple-500/20';
  };

  const getTextColor = (pct) => {
    if (pct >= 90) return 'text-rose-400 font-semibold';
    if (pct >= 75) return 'text-amber-400 font-semibold';
    return 'text-slate-300';
  };

  if (compact) {
    return (
      <div className="space-y-2 text-xs">
        {/* Compact Tokens */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles size={11} className="text-purple-400" />
              <span>AI Tokens</span>
            </span>
            <span className={getTextColor(percentages.tokens)}>
              {percentages.tokens}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percentages.tokens)} transition-all duration-500`}
              style={{ width: `${Math.min(100, percentages.tokens)}%` }}
            />
          </div>
        </div>

        {/* Compact Compute */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Cpu size={11} className="text-cyan-400" />
              <span>Compute Hours</span>
            </span>
            <span className={getTextColor(percentages.compute)}>
              {percentages.compute}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percentages.compute)} transition-all duration-500`}
              style={{ width: `${Math.min(100, percentages.compute)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status.upgradeRecommended && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span>
              {status.isAnyExceeded
                ? 'You have exceeded monthly resource quotas for the Free plan.'
                : 'Approaching monthly resource limits (80%+ consumed).'}
            </span>
          </div>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="px-2.5 py-1 rounded bg-amber-500 text-black font-semibold text-[11px] hover:bg-amber-400 transition-colors flex items-center gap-1 shrink-0"
            >
              <span>Upgrade</span>
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* 1. AI Tokens */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Sparkles size={13} className="text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-white">Monthly AI Tokens</div>
              <div className="text-[10px] text-ide-muted">Autonomous agent reasoning and edits</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${getTextColor(percentages.tokens)} font-mono`}>
              {usage.tokensUsed.toLocaleString()} / {limits.maxTokensMonthly.toLocaleString()}
            </div>
            <div className="text-[10px] text-ide-muted">{percentages.tokens}% used</div>
          </div>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percentages.tokens)} transition-all duration-500`}
            style={{ width: `${Math.min(100, percentages.tokens)}%` }}
          />
        </div>
      </div>

      {/* 2. Sandbox Compute Runtime */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Cpu size={13} className="text-cyan-400" />
            </div>
            <div>
              <div className="font-medium text-white">Sandbox Compute Time</div>
              <div className="text-[10px] text-ide-muted">Docker terminal sessions and dev servers</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${getTextColor(percentages.compute)} font-mono`}>
              {usage.computeHoursUsed} / {limits.maxSandboxHoursMonthly} hrs
            </div>
            <div className="text-[10px] text-ide-muted">{percentages.compute}% used</div>
          </div>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percentages.compute)} transition-all duration-500`}
            style={{ width: `${Math.min(100, percentages.compute)}%` }}
          />
        </div>
      </div>

      {/* 3. Managed Workspaces */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <HardDrive size={13} className="text-indigo-400" />
            </div>
            <div>
              <div className="font-medium text-white">Workspaces & Projects</div>
              <div className="text-[10px] text-ide-muted">Simultaneous cloud projects</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${getTextColor(percentages.projects)} font-mono`}>
              {usage.projectCount} / {limits.maxProjects} projects
            </div>
            <div className="text-[10px] text-ide-muted">{percentages.projects}% used</div>
          </div>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getBarColor(percentages.projects)} transition-all duration-500`}
            style={{ width: `${Math.min(100, percentages.projects)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
