/**
 * @file SourceControlPanel.jsx
 * Cyberpunk Git Source Control sidebar panel for Kodra IDE.
 * Provides staging, unstaging, AI commit generation, diff inspection, and branch switching.
 */

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCode,
  FolderGit2,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import { DiffModal } from './DiffModal.jsx';

export function SourceControlPanel({
  git,
  onFileSelect
}) {
  const {
    status,
    branches,
    history,
    diff,
    isLoading,
    isDiffLoading,
    isCommitting,
    isAiGenerating,
    error,
    refreshStatus,
    refreshBranches,
    refreshHistory,
    fetchDiff,
    stageFiles,
    unstageFiles,
    stageAll,
    commit,
    checkoutBranch,
    generateCommitMessage
  } = git;

  const [commitMessage, setCommitMessage] = useState('');
  const [isStagedExpanded, setIsStagedExpanded] = useState(true);
  const [isChangesExpanded, setIsChangesExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [activeDiffFile, setActiveDiffFile] = useState(null);
  const [activeDiffStaged, setActiveDiffStaged] = useState(false);
  const [panelError, setPanelError] = useState(null);

  // Clear panel error after 5s
  useEffect(() => {
    if (panelError) {
      const timer = setTimeout(() => setPanelError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [panelError]);

  const currentBranch = branches.find((b) => b.current)?.name || status?.branch || 'main';

  // Handle AI Commit Message generation
  const handleAiMessage = async () => {
    try {
      setPanelError(null);
      const msg = await generateCommitMessage();
      if (msg) {
        setCommitMessage(msg);
      }
    } catch (err) {
      setPanelError(err.message || 'Failed to generate commit message.');
    }
  };

  // Handle Commit Submit
  const handleCommitSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = commitMessage.trim();
    if (!trimmed) {
      setPanelError('Please write a commit message.');
      return;
    }

    const stagedCount = status?.staged?.length || 0;
    const unstagedCount = (status?.unstaged?.length || 0) + (status?.untracked?.length || 0);

    // If no files staged, offer to stage all
    let shouldStageAll = false;
    if (stagedCount === 0 && unstagedCount > 0) {
      shouldStageAll = true;
    } else if (stagedCount === 0 && unstagedCount === 0) {
      setPanelError('No changes detected to commit.');
      return;
    }

    try {
      setPanelError(null);
      await commit({ message: trimmed, stageAll: shouldStageAll });
      setCommitMessage('');
    } catch (err) {
      setPanelError(err.message || 'Commit failed.');
    }
  };

  // Open diff view for specific file
  const handleViewDiff = async (fileObj, isStaged) => {
    try {
      setActiveDiffFile(fileObj.path);
      setActiveDiffStaged(isStaged);
      await fetchDiff({ staged: isStaged, filePath: fileObj.path });
      setIsDiffModalOpen(true);
    } catch (err) {
      setPanelError(err.message || 'Failed to inspect file diff.');
    }
  };

  // Switch or Create Branch
  const handleSwitchBranch = async (branchName) => {
    try {
      setIsBranchDropdownOpen(false);
      await checkoutBranch({ branch: branchName, create: false });
    } catch (err) {
      setPanelError(err.message || `Failed to switch to branch "${branchName}".`);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;

    try {
      await checkoutBranch({ branch: name, create: true });
      setNewBranchName('');
      setIsCreatingBranch(false);
      setIsBranchDropdownOpen(false);
    } catch (err) {
      setPanelError(err.message || `Failed to create branch "${name}".`);
    }
  };

  const stagedFiles = status?.staged || [];
  const unstagedFiles = [
    ...(status?.unstaged || []).map((f) => ({ ...f, type: 'unstaged' })),
    ...(status?.untracked || []).map((p) => ({ path: p, status: 'U', type: 'untracked' }))
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0c13] border-r border-ide-border text-xs select-none relative">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border/70 text-[10.5px] tracking-wider uppercase text-slate-400 font-semibold shrink-0">
        <span className="flex items-center gap-1.5 text-slate-300">
          <FolderGit2 size={13} className="text-purple-400" />
          Source Control
        </span>

        <div className="flex items-center gap-1">
          {/* Refresh status */}
          <button
            onClick={() => refreshStatus()}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all disabled:opacity-40"
            title="Refresh Git Status"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-purple-400' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Branch Selector Bar */}
      <div className="px-3 py-2 border-b border-white/5 bg-[#08090e] shrink-0">
        <div className="relative">
          <button
            onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-[11px] transition-colors"
            title="Switch or create branches"
          >
            <div className="flex items-center gap-1.5 truncate">
              <GitBranch size={13} className="text-purple-400 shrink-0" />
              <span className="truncate font-semibold">{currentBranch}</span>
            </div>
            <ChevronDown size={12} className="text-slate-500 shrink-0" />
          </button>

          {/* Branch Dropdown Menu */}
          {isBranchDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl glass-dropdown border border-white/10 shadow-2xl p-1.5 bg-[#0f121d] animate-in fade-in duration-150">
              <div className="text-[10px] uppercase font-semibold text-slate-500 px-2 py-1 tracking-wider">
                Branches
              </div>

              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => handleSwitchBranch(b.name)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left font-mono text-[11px] transition-colors ${
                      b.current
                        ? 'bg-purple-500/20 text-purple-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {b.current && <Check size={11} className="text-purple-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="pt-1.5 mt-1 border-t border-white/5">
                {isCreatingBranch ? (
                  <form onSubmit={handleCreateBranch} className="space-y-1.5 p-1">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="new-branch-name"
                      autoFocus
                      className="w-full bg-[#161a29] border border-purple-500/30 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                    />
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingBranch(false)}
                        className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreatingBranch(true)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
                  >
                    <PlusCircle size={12} />
                    <span>Create new branch...</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {(panelError || error) && (
        <div className="mx-2 mt-2 p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-[11px] text-red-300 flex items-start gap-1.5 shrink-0 animate-in fade-in">
          <AlertCircle size={13} className="shrink-0 text-red-400 mt-0.5" />
          <span className="break-words">{panelError || error}</span>
        </div>
      )}

      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-4">
        {/* 3. Commit Input & Actions */}
        <div className="space-y-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
          <div className="relative">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleCommitSubmit();
                }
              }}
              placeholder="Commit message (Ctrl+Enter)..."
              rows={3}
              className="w-full bg-[#111420] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/40 resize-none font-mono text-[11.5px]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* AI Generate Commit Message */}
            <button
              onClick={handleAiMessage}
              disabled={isAiGenerating}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-[11px] font-medium transition-all disabled:opacity-50"
              title="Generate commit message from diff using Kodra AI"
            >
              <Sparkles
                size={12}
                className={isAiGenerating ? 'animate-spin text-purple-400' : 'text-purple-400'}
              />
              <span>{isAiGenerating ? 'Analyzing...' : 'AI Message'}</span>
            </button>

            {/* Commit Button */}
            <button
              onClick={handleCommitSubmit}
              disabled={isCommitting || (!commitMessage.trim() && stagedFiles.length === 0 && unstagedFiles.length === 0)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-semibold shadow-glow-sm transition-all disabled:opacity-40"
              title="Commit staged changes"
            >
              {isCommitting ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <GitCommit size={12} />
              )}
              <span>{isCommitting ? 'Committing...' : 'Commit'}</span>
            </button>
          </div>
        </div>

        {/* 4. Staged Changes Section */}
        <div>
          <div className="flex items-center justify-between py-1 px-1 text-slate-400 group">
            <button
              onClick={() => setIsStagedExpanded((prev) => !prev)}
              className="flex items-center gap-1 font-semibold text-[11px] hover:text-white"
            >
              {isStagedExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Staged Changes</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                {stagedFiles.length}
              </span>
            </button>

            {stagedFiles.length > 0 && (
              <button
                onClick={() => unstageFiles(['.'])}
                className="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-white p-0.5 rounded transition-all"
                title="Unstage All Changes"
              >
                <Minus size={13} />
              </button>
            )}
          </div>

          {isStagedExpanded && (
            <div className="mt-1 space-y-0.5">
              {stagedFiles.length === 0 ? (
                <div className="py-2 text-center text-[10.5px] text-slate-600 italic">
                  No staged changes
                </div>
              ) : (
                stagedFiles.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => handleViewDiff(f, true)}
                    className="group flex items-center justify-between px-2 py-1 rounded-md text-[11.5px] font-mono cursor-pointer hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-bold text-emerald-400 w-3">
                        {f.status || 'M'}
                      </span>
                      <span className="truncate text-slate-200">{f.path}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unstageFiles([f.path]);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-white rounded transition-opacity"
                      title="Unstage file"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 5. Working Tree Changes (Unstaged & Untracked) */}
        <div>
          <div className="flex items-center justify-between py-1 px-1 text-slate-400 group">
            <button
              onClick={() => setIsChangesExpanded((prev) => !prev)}
              className="flex items-center gap-1 font-semibold text-[11px] hover:text-white"
            >
              {isChangesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Changes</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold">
                {unstagedFiles.length}
              </span>
            </button>

            {unstagedFiles.length > 0 && (
              <button
                onClick={() => stageAll()}
                className="opacity-70 group-hover:opacity-100 text-slate-400 hover:text-white p-0.5 rounded transition-all"
                title="Stage All Changes"
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {isChangesExpanded && (
            <div className="mt-1 space-y-0.5">
              {unstagedFiles.length === 0 ? (
                <div className="py-2 text-center text-[10.5px] text-slate-600 italic">
                  Working tree clean
                </div>
              ) : (
                unstagedFiles.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => handleViewDiff(f, false)}
                    className="group flex items-center justify-between px-2 py-1 rounded-md text-[11.5px] font-mono cursor-pointer hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-[10px] font-bold w-3 ${
                          f.status === 'U'
                            ? 'text-cyan-400'
                            : f.status === 'D'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {f.status || 'M'}
                      </span>
                      <span className="truncate text-slate-300">{f.path}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        stageFiles([f.path]);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-white rounded transition-opacity"
                      title="Stage file"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 6. Commit History Section */}
        <div>
          <div className="flex items-center justify-between py-1 px-1 text-slate-400">
            <button
              onClick={() => {
                if (!isHistoryExpanded && history.length === 0) {
                  refreshHistory();
                }
                setIsHistoryExpanded((prev) => !prev);
              }}
              className="flex items-center gap-1 font-semibold text-[11px] hover:text-white"
            >
              {isHistoryExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Commit History</span>
              {history.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {isHistoryExpanded && (
            <div className="mt-1 space-y-1">
              {history.length === 0 ? (
                <div className="py-2 text-center text-[10.5px] text-slate-600 italic">
                  No commits found
                </div>
              ) : (
                history.map((c) => (
                  <div
                    key={c.commit}
                    className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-1 hover:border-purple-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-purple-400 font-semibold">{c.commit}</span>
                      <span className="text-slate-500">{c.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                      {c.message}
                    </p>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>{c.author}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 7. Unified Diff Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        diffData={diff}
        fileName={activeDiffFile}
        isStaged={activeDiffStaged}
      />
    </div>
  );
}
