import React, { useState, useMemo } from 'react';
import {
  Code2,
  Plus,
  Search,
  FolderGit2,
  Play,
  Copy,
  Download,
  Trash2,
  Edit3,
  Sparkles,
  Layers,
  Server,
  FileCode,
  Globe,
  Clock,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Cpu,
  CreditCard,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { UserMenu } from '../components/Auth/UserMenu.jsx';
import { RenameProjectModal } from '../components/Dashboard/RenameProjectModal.jsx';
import { DeleteConfirmModal } from '../components/Dashboard/DeleteConfirmModal.jsx';
import { NewProjectModal } from '../components/Layout/NewProjectModal.jsx';
import { ImportGitModal } from '../components/Git/ImportGitModal.jsx';
import { ProjectTemplates } from '@kodra/shared';
import { api } from '../services/api.js';

export function Dashboard({
  projects = [],
  currentProject,
  onSelectProject,
  onCreateProject,
  onImportGitProject,
  onUpdateProject,
  onCloneProject,
  onDeleteProject,
  onDownloadZip,
  onRefreshProjects,
  onOpenAuthModal,
  onLaunchIDE,
  onOpenLanding,
  onOpenBillingModal,
  onOpenUpgradeModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [billingUsage, setBillingUsage] = useState(null);

  // Fetch billing telemetry for dashboard overview card
  React.useEffect(() => {
    api.getBillingUsage().then(setBillingUsage).catch(() => {});
  }, [projects.length]);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isImportGitModalOpen, setIsImportGitModalOpen] = useState(false);
  const [renamingProject, setRenamingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTemplate =
        selectedTemplate === 'all' || p.template === selectedTemplate;

      return matchesSearch && matchesTemplate;
    });
  }, [projects, searchQuery, selectedTemplate]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: projects.length,
      reactCount: projects.filter((p) => p.template === ProjectTemplates.VITE_REACT).length,
      nodeCount: projects.filter((p) => p.template === ProjectTemplates.NODE_EXPRESS).length,
      vanillaCount: projects.filter((p) => p.template === ProjectTemplates.VANILLA).length,
      runningCount: projects.filter((p) => p.status === 'running').length
    };
  }, [projects]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshProjects();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleClone = async (p) => {
    try {
      setActionLoadingId(p._id);
      await onCloneProject(p._id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = async (p) => {
    try {
      setActionLoadingId(p._id);
      await onDownloadZip(p._id, p.name);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTemplateMeta = (template) => {
    switch (template) {
      case ProjectTemplates.VITE_REACT:
        return {
          label: 'React + Vite',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          icon: Cpu
        };
      case ProjectTemplates.NODE_EXPRESS:
        return {
          label: 'Node.js API',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          icon: Server
        };
      case ProjectTemplates.VANILLA:
      default:
        return {
          label: 'Vanilla JS',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          icon: Globe
        };
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-screen bg-[#07080c] text-ide-text select-none overflow-x-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-white/[0.08] bg-[#090b10]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenLanding}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer text-left"
            title="Return to Product Overview"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-[#0d0f17] rounded-[11px] flex items-center justify-center">
                <Code2 size={18} className="text-purple-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-sm bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  KODRA
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  Cloud Studio
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportGitModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            title="Import a remote repository from GitHub, GitLab, or Bitbucket"
          >
            <FolderGit2 size={14} className="text-purple-400" />
            <span>Import from Git</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all active:scale-95"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>

          <div className="pl-2 border-l border-white/10">
            <UserMenu
              onOpenAuthModal={onOpenAuthModal}
              onOpenBillingModal={onOpenBillingModal}
              onOpenUpgradeModal={onOpenUpgradeModal}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Banner Hero & Quick Summary */}
        <div className="relative rounded-3xl p-8 mb-8 overflow-hidden border border-white/10 bg-gradient-to-br from-[#121422] via-[#0c0e18] to-[#080911] shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-48 -mb-16 w-60 h-60 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
              <Sparkles size={12} className="text-purple-400" />
              <span>Fullstack Containerized Workspaces</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Manage Your Cloud Projects
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Autonomous execution sandboxes, live browser preview with Hot Module Reloading, and deep multi-tenant project isolation.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5 max-w-3xl">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-ide-muted tracking-wider">Total Workspaces</div>
              <div className="text-xl font-bold text-white mt-1 font-mono">{stats.total}</div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">React + Vite</div>
              <div className="text-xl font-bold text-cyan-300 mt-1 font-mono">{stats.reactCount}</div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Node APIs</div>
              <div className="text-xl font-bold text-emerald-300 mt-1 font-mono">{stats.nodeCount}</div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Active Sandboxes</div>
              <div className="text-xl font-bold text-purple-300 mt-1 font-mono">{stats.runningCount}</div>
            </div>
          </div>

          {/* Monthly Resource Quota Widget */}
          {billingUsage && (
            <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Plan: {billingUsage.plan}
                    </span>
                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                      billingUsage.plan === 'pro'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>
                      {billingUsage.subscriptionStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-ide-muted mt-0.5">
                    Tokens: <span className="text-white font-mono">{billingUsage.usage?.tokensUsed?.toLocaleString() || 0}</span> / {billingUsage.limits?.maxTokensMonthly?.toLocaleString()} • Compute: <span className="text-white font-mono">{billingUsage.usage?.computeHoursUsed || 0}</span> / {billingUsage.limits?.maxSandboxHoursMonthly} hrs
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onOpenBillingModal && (
                  <button
                    onClick={onOpenBillingModal}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 hover:text-white transition-colors"
                  >
                    Manage Quotas
                  </button>
                )}
                {billingUsage.plan !== 'pro' && onOpenUpgradeModal && (
                  <button
                    onClick={onOpenUpgradeModal}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-semibold shadow-glow-sm flex items-center gap-1.5 transition-all"
                  >
                    <Zap size={13} />
                    <span>Upgrade to Pro ($20/mo)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter & Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-3 text-ide-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces by name..."
              className="w-full bg-[#10131d] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-ide-muted focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
            />
          </div>

          {/* Template Filter Pills & Refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center bg-[#10131d] p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSelectedTemplate('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedTemplate === 'all'
                    ? 'bg-purple-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({projects.length})
              </button>
              <button
                onClick={() => setSelectedTemplate(ProjectTemplates.VITE_REACT)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedTemplate === ProjectTemplates.VITE_REACT
                    ? 'bg-purple-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                React
              </button>
              <button
                onClick={() => setSelectedTemplate(ProjectTemplates.NODE_EXPRESS)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedTemplate === ProjectTemplates.NODE_EXPRESS
                    ? 'bg-purple-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Node
              </button>
              <button
                onClick={() => setSelectedTemplate(ProjectTemplates.VANILLA)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedTemplate === ProjectTemplates.VANILLA
                    ? 'bg-purple-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vanilla
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#10131d] border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Refresh project list"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-purple-400' : ''} />
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d0f18]/60 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <FolderGit2 size={28} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? 'No matching workspaces' : 'No workspaces yet'}
            </h3>
            <p className="text-xs text-ide-muted max-w-sm mx-auto mb-5">
              {searchQuery
                ? `No projects matched "${searchQuery}". Clear your search query or create a new project.`
                : 'Scaffold your first application workspace with React + Vite, Node.js API, or Vanilla JS.'}
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const meta = getTemplateMeta(project.template);
              const TemplateIcon = meta.icon;
              const isCurrent = currentProject?._id === project._id;
              const isLoading = actionLoadingId === project._id;

              return (
                <div
                  key={project._id}
                  className={`group relative rounded-2xl bg-[#0f111a] border transition-all duration-200 flex flex-col justify-between overflow-hidden p-5 shadow-lg ${
                    isCurrent
                      ? 'border-purple-500/50 shadow-purple-950/20 ring-1 ring-purple-500/30'
                      : 'border-white/[0.08] hover:border-purple-500/40 hover:-translate-y-0.5'
                  }`}
                >
                  {/* Top Details & Template Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${meta.color}`}>
                        <TemplateIcon size={12} />
                        <span>{meta.label}</span>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-ide-muted">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            project.status === 'running'
                              ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
                              : project.status === 'error'
                              ? 'bg-red-400'
                              : 'bg-cyan-400'
                          }`}
                        />
                        <span className="capitalize">{project.status || 'ready'}</span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate font-mono">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed min-h-[32px]">
                      {project.description || 'No description provided.'}
                    </p>

                    {/* Timestamps */}
                    <div className="flex items-center gap-2 text-[10px] text-ide-muted mt-4 font-mono">
                      <Clock size={11} />
                      <span>Updated {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                    {/* Launch IDE Button */}
                    <button
                      onClick={() => {
                        onSelectProject(project);
                        onLaunchIDE(project);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-sm transition-all active:scale-95"
                    >
                      <Play size={12} className="fill-current" />
                      <span>Launch IDE</span>
                    </button>

                    {/* Secondary Action Toolbar */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRenamingProject(project)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Rename Project"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => handleClone(project)}
                        disabled={isLoading}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Clone Project"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        onClick={() => handleDownload(project)}
                        disabled={isLoading}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Download ZIP Archive"
                      >
                        <Download size={13} />
                      </button>

                      <button
                        onClick={() => setDeletingProject(project)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreateProject={onCreateProject}
      />

      <ImportGitModal
        isOpen={isImportGitModalOpen}
        onClose={() => setIsImportGitModalOpen(false)}
        onImport={onImportGitProject}
      />

      <RenameProjectModal
        isOpen={Boolean(renamingProject)}
        project={renamingProject}
        onClose={() => setRenamingProject(null)}
        onSave={onUpdateProject}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingProject)}
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirmDelete={onDeleteProject}
      />
    </div>
  );
}
