import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, AlertCircle } from 'lucide-react';

export function DeleteConfirmModal({ isOpen, onClose, project, onConfirmDelete }) {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !project) return null;

  const isConfirmed = confirmName.trim() === project.name;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setError(null);

    try {
      setIsDeleting(true);
      await onConfirmDelete(project._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-2xl glass-dropdown border border-red-500/20 shadow-2xl p-6 overflow-hidden">
        {/* Danger Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-44 h-44 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Delete Project</h2>
            <p className="text-xs text-red-300/80">This action cannot be undone</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-xs text-slate-300 space-y-2 mb-5 leading-relaxed">
          <p>
            You are about to permanently delete <strong className="text-white font-mono">{project.name}</strong>.
          </p>
          <p className="text-ide-muted">
            All workspace files, virtual filesystems, and associated execution sandboxes will be permanently purged from host disk storage.
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-[11px] font-medium text-ide-muted mb-1.5">
            Type <span className="text-purple-300 font-mono select-all font-semibold">{project.name}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project.name}
            className="w-full bg-black/50 border border-white/10 focus:border-red-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-ide-muted font-mono transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} />
            <span>{isDeleting ? 'Deleting...' : 'Delete Workspace'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
