/**
 * @file ImportGitModal.jsx
 * Cyberpunk modal for importing/cloning remote Git and GitHub repositories.
 */

import React, { useState } from 'react';
import { GitBranch, X, AlertCircle, Download, Key, Link as LinkIcon, FolderGit2 } from 'lucide-react';

export function ImportGitModal({ isOpen, onClose, onImport }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Auto-fill project name from URL if name is empty
  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (!name || name === extractRepoName(url)) {
      const extracted = extractRepoName(newUrl);
      if (extracted) {
        setName(extracted);
      }
    }
  };

  const extractRepoName = (repoUrl) => {
    if (!repoUrl) return '';
    try {
      const parts = repoUrl.trim().replace(/\/$/, '').split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.replace(/\.git$/, '');
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please provide a Git repository URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onImport({
        url: trimmedUrl,
        name: name.trim() || undefined,
        branch: branch.trim() || undefined,
        token: token.trim() || undefined,
        description: description.trim() || undefined
      });
      // Reset state and close on success
      setUrl('');
      setName('');
      setBranch('');
      setToken('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to clone repository.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 overflow-hidden bg-[#0e101a]/95">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ide-muted hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <GitBranch size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Import Git Repository</h3>
            <p className="text-xs text-ide-muted mt-0.5">
              Clone a remote repository and auto-detect workspace runtime
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle size={15} className="shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Repo URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Repository URL <span className="text-purple-400">*</span>
            </label>
            <div className="relative">
              <LinkIcon size={14} className="absolute left-3 top-3 text-ide-muted" />
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://github.com/user/repository.git"
                disabled={isSubmitting}
                className="w-full bg-[#121422] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors font-mono disabled:opacity-50"
                required
              />
            </div>
            <p className="text-[10px] text-ide-muted mt-1">
              Supports HTTPS, GitHub, GitLab, and Bitbucket URLs.
            </p>
          </div>

          {/* Project Name & Branch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Workspace Name
              </label>
              <div className="relative">
                <FolderGit2 size={14} className="absolute left-3 top-3 text-ide-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-git-project"
                  disabled={isSubmitting}
                  className="w-full bg-[#121422] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Specific Branch <span className="text-ide-muted font-normal">(optional)</span>
              </label>
              <div className="relative">
                <GitBranch size={14} className="absolute left-3 top-3 text-ide-muted" />
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main / master"
                  disabled={isSubmitting}
                  className="w-full bg-[#121422] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors font-mono disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Personal Access Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Personal Access Token <span className="text-ide-muted font-normal">(for private repos)</span>
            </label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-3 text-ide-muted" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                disabled={isSubmitting}
                className="w-full bg-[#121422] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors font-mono disabled:opacity-50"
              />
            </div>
            <p className="text-[10px] text-ide-muted mt-1">
              Used strictly during cloning. Scrubbed and never saved in repository configuration.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description <span className="text-ide-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Imported repository from GitHub"
              disabled={isSubmitting}
              className="w-full bg-[#121422] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-ide-muted focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Cloning Repo...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Import Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
