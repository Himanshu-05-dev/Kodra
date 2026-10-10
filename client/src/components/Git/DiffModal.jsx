/**
 * @file DiffModal.jsx
 * Cyberpunk modal for inspecting unified Git diffs with syntax coloring.
 */

import React, { useState } from 'react';
import { X, GitCommit, Copy, Check, FileCode, Layers } from 'lucide-react';

export function DiffModal({ isOpen, onClose, diffData, fileName, isStaged }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const diffText = diffData?.diff || '';

  const handleCopy = () => {
    if (!diffText) return;
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diffText ? diffText.split('\n') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl glass-dropdown border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-[#0d0f18]/95">
        {/* Glow backdrop */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#090b12] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileCode size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  {fileName || 'Workspace Changes Diff'}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isStaged
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}
                >
                  {isStaged ? 'Staged' : 'Working Tree'}
                </span>
              </div>
              <p className="text-xs text-ide-muted mt-0.5">
                Inspect line-by-line unified git additions and deletions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!diffText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-40"
              title="Copy diff to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy Diff'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ide-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Diff Content Viewer */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs select-text">
          {lines.length === 0 || !diffText.trim() ? (
            <div className="flex flex-col items-center justify-center h-48 text-ide-muted select-none">
              <Layers size={28} className="mb-2 opacity-40 text-cyan-400" />
              <p className="text-sm">No text diff available</p>
              <p className="text-xs opacity-60 mt-1">
                File may be newly untracked, binary, or unmodified.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#07080d] p-3 overflow-x-auto space-y-[2px]">
              {lines.map((line, idx) => {
                let lineClass = 'text-slate-400 px-2 py-0.5';
                if (line.startsWith('+++') || line.startsWith('---')) {
                  lineClass = 'text-slate-300 font-semibold bg-white/[0.03] px-2 py-0.5';
                } else if (line.startsWith('+')) {
                  lineClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5';
                } else if (line.startsWith('-')) {
                  lineClass = 'bg-red-950/40 text-red-300 border-l-2 border-red-500 px-2 py-0.5';
                } else if (line.startsWith('@@')) {
                  lineClass = 'bg-purple-950/30 text-purple-300 border-l-2 border-purple-500/50 px-2 py-0.5 text-[11px] font-semibold my-1';
                } else if (line.startsWith('diff --git')) {
                  lineClass = 'text-cyan-400 font-bold border-t border-white/10 pt-2 pb-0.5 px-2 mt-2';
                }

                return (
                  <div key={idx} className={`whitespace-pre font-mono leading-relaxed rounded-sm ${lineClass}`}>
                    {line || ' '}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-[#090b12] flex items-center justify-between text-[11px] text-ide-muted shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Added
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Deleted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Hunk Header
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
