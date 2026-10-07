import React, { useState } from 'react';
import { X, FolderPlus, Sparkles, Server, Layout } from 'lucide-react';

export function NewProjectModal({ isOpen, onClose, onCreateProject }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('vite-react');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateProject({
        name: name.trim(),
        template,
        description: description.trim()
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const templates = [
    {
      id: 'vite-react',
      title: 'React + Vite',
      desc: 'Modern React 18 SPA with fast Hot Module Replacement (HMR).',
      icon: <Sparkles size={18} className="text-blue-400" />
    },
    {
      id: 'node-express',
      title: 'Node.js + Express',
      desc: 'REST API backend server with modular route handlers.',
      icon: <Server size={18} className="text-emerald-400" />
    },
    {
      id: 'vanilla',
      title: 'Vanilla Web App',
      desc: 'Pure HTML5, CSS3, and modern ES6 JavaScript.',
      icon: <Layout size={18} className="text-amber-400" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="bg-ide-sidebar border border-ide-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border bg-ide-bg">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <FolderPlus size={16} className="text-ide-accent" />
            <span>Create New Kodra Project</span>
          </div>
          <button
            onClick={onClose}
            className="text-ide-muted hover:text-white p-1 rounded hover:bg-ide-hover"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-ide-text font-medium">Project Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. my-saas-dashboard"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
              className="w-full bg-ide-panel text-white text-xs px-3 py-2 rounded-md border border-ide-border focus:border-ide-accent focus:outline-none"
            />
            <p className="text-[10px] text-ide-muted">Only letters, numbers, hyphens, and underscores.</p>
          </div>

          {/* Template Selection */}
          <div className="space-y-1.5">
            <label className="text-ide-text font-medium">Starter Template</label>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                    template === t.id
                      ? 'border-ide-accent bg-blue-500/10 text-white'
                      : 'border-ide-border bg-ide-panel/50 text-ide-muted hover:border-ide-muted hover:text-ide-text'
                  }`}
                >
                  <div className="p-1 rounded bg-ide-bg border border-ide-border shrink-0">
                    {t.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white">{t.title}</div>
                    <div className="text-[11px] text-ide-muted mt-0.5">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-ide-text font-medium">Description (Optional)</label>
            <input
              type="text"
              placeholder="Brief summary of your project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-ide-panel text-white text-xs px-3 py-2 rounded-md border border-ide-border focus:border-ide-accent focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ide-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-ide-text hover:bg-ide-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 rounded bg-ide-accent text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? 'Scaffolding...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
