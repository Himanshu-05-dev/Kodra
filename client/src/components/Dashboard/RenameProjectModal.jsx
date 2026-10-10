import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle, Save } from 'lucide-react';

export function RenameProjectModal({ isOpen, onClose, project, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setError(null);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Project name must be at least 2 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
      setError('Project name can only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(project._id, { name: trimmed, description: description.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Edit3 size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Edit Project Details</h2>
            <p className="text-xs text-ide-muted">Update workspace name and description</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-ide-muted mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. my-cool-project"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-ide-muted focus:outline-none focus:border-purple-500 font-mono transition-colors"
            />
            <p className="text-[10px] text-ide-muted mt-1">Alphanumeric, hyphens, and underscores only</p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ide-muted mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the application scope..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-ide-muted focus:outline-none focus:border-purple-500 resize-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all disabled:opacity-50"
            >
              <Save size={13} />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
