import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Layout/Navbar.jsx';
import { ActivityBar } from './components/Layout/ActivityBar.jsx';
import { MainLayout } from './components/Layout/MainLayout.jsx';
import { StatusBar } from './components/Layout/StatusBar.jsx';
import { FileTree } from './components/FileExplorer/FileTree.jsx';
import { EditorTabs } from './components/Editor/EditorTabs.jsx';
import { CodeEditor } from './components/Editor/CodeEditor.jsx';
import { TerminalPanel } from './components/Terminal/TerminalPanel.jsx';
import { ChatPanel } from './components/Chat/ChatPanel.jsx';
import { PreviewPanel } from './components/Preview/PreviewPanel.jsx';
import { NewProjectModal } from './components/Layout/NewProjectModal.jsx';
import { CommandPalette } from './components/Layout/CommandPalette.jsx';
import { AuthModal } from './components/Auth/AuthModal.jsx';
import { SourceControlPanel } from './components/Git/SourceControlPanel.jsx';
import { ImportGitModal } from './components/Git/ImportGitModal.jsx';
import { UpgradeModal, BillingModal } from './components/Billing/index.js';
import { Dashboard } from './pages/Dashboard.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { Sparkles, Globe, X } from 'lucide-react';
import { useProject } from './hooks/useProject.js';
import { useEditor } from './hooks/useEditor.js';
import { useVibeMode } from './hooks/useVibeMode.js';
import { useGit } from './hooks/useGit.js';
import { useAuth } from './contexts/AuthContext.jsx';
import { api } from './services/api.js';

export function App() {
  const { user, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'dashboard' | 'ide'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const {
    projects,
    currentProject,
    fileTree,
    isLoadingTree,
    backendConnected,
    createProject,
    updateProject,
    cloneProject,
    deleteProject,
    downloadProjectZip,
    selectProject,
    refreshProjects,
    refreshFileTree
  } = useProject();

  const {
    tabs,
    activeTab,
    activeTabPath,
    activeContent,
    isSaving,
    editorError,
    openFile,
    updateContent,
    saveFile,
    closeTab,
    setActiveTabPath,
    resetTabs
  } = useEditor();

  const { isVibeModeActive, toggleVibeMode } = useVibeMode();
  const git = useGit(currentProject?._id);

  // Layout View States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState('files'); // 'files' | 'git'
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelView, setRightPanelView] = useState('agent'); // 'agent' | 'preview'
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isImportGitModalOpen, setIsImportGitModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info', code = null) => {
    setNotification({ message, type });
    if (code === 'QUOTA_EXCEEDED' || (typeof message === 'string' && message.toLowerCase().includes('quota'))) {
      setIsUpgradeModalOpen(true);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Activity Bar Toggle Handler
  const handleToggleActivityView = (view) => {
    if (view === 'files') {
      if (isSidebarOpen && sidebarView === 'files') {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
        setSidebarView('files');
      }
    } else if (view === 'git') {
      if (isSidebarOpen && sidebarView === 'git') {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
        setSidebarView('git');
        git.refreshStatus();
      }
    } else if (view === 'terminal') {
      setIsTerminalOpen((prev) => !prev);
    } else if (view === 'agent') {
      if (isRightPanelOpen && rightPanelView === 'agent') {
        setIsRightPanelOpen(false);
      } else {
        setIsRightPanelOpen(true);
        setRightPanelView('agent');
      }
    } else if (view === 'preview') {
      if (isRightPanelOpen && rightPanelView === 'preview') {
        setIsRightPanelOpen(false);
      } else {
        setIsRightPanelOpen(true);
        setRightPanelView('preview');
      }
    }
  };

  // Switch project handler
  const handleSelectProject = (project) => {
    resetTabs();
    selectProject(project);
    showNotification(`Switched to "${project.name}"`, 'info');
  };

  // Create new file / folder in current project
  const handleCreateFile = async (relativePath, isFolder = false) => {
    if (!currentProject?._id) return;

    try {
      if (isFolder) {
        const placeholderPath = `${relativePath}/.gitkeep`;
        await api.saveFileContent(currentProject._id, placeholderPath, '');
      } else {
        await api.saveFileContent(currentProject._id, relativePath, '// New file in Kodra\n');
        await openFile(currentProject._id, relativePath);
      }
      await refreshFileTree(currentProject._id);
      git.refreshStatus();
      showNotification(`Created ${isFolder ? 'folder' : 'file'} "${relativePath}"`, 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Delete file in current project
  const handleDeleteFile = async (relativePath) => {
    if (!currentProject?._id) return;

    try {
      await api.deleteFile(currentProject._id, relativePath);
      closeTab(relativePath);
      await refreshFileTree(currentProject._id);
      git.refreshStatus();
      showNotification(`Deleted "${relativePath}"`, 'info');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Save active file
  const handleSaveActiveFile = async () => {
    if (!currentProject?._id || !activeTabPath) return;

    const ok = await saveFile(currentProject._id, activeTabPath);
    if (ok) {
      showNotification(`Saved "${activeTabPath}"`, 'success');
      git.refreshStatus();
    } else if (editorError) {
      showNotification(editorError, 'error');
    }
  };

  // Global Keybindings: Ctrl+S (Save), Ctrl+K / Cmd+K (Command Palette)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveActiveFile]);

  // If current project is null or removed, return to dashboard
  useEffect(() => {
    if (!currentProject && viewMode === 'ide') {
      setViewMode('dashboard');
    }
  }, [currentProject, viewMode]);

  // View 1: Public Marketing Landing Page
  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen w-screen bg-[#06070a] text-ide-text select-none">
        {notification && (
          <div
            className={`fixed bottom-8 right-6 z-50 px-3.5 py-2 rounded-xl text-xs font-medium shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              notification.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-300'
                : notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : 'bg-[#121520]/90 border-white/10 text-white'
            }`}
          >
            {notification.message}
          </div>
        )}

        <LandingPage
          onLaunchDashboard={() => setViewMode('dashboard')}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          isAuthenticated={isAuthenticated}
          user={user}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  // View 2: Cloud Workspaces Dashboard
  if (viewMode === 'dashboard') {
    return (
      <div className="min-h-screen w-screen bg-[#07080c] text-ide-text select-none">
        {notification && (
          <div
            className={`fixed bottom-8 right-6 z-50 px-3.5 py-2 rounded-xl text-xs font-medium shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              notification.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-300'
                : notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : 'bg-[#121520]/90 border-white/10 text-white'
            }`}
          >
            {notification.message}
          </div>
        )}

        <Dashboard
          projects={projects}
          currentProject={currentProject}
          onSelectProject={handleSelectProject}
          onCreateProject={async (data) => {
            const p = await createProject(data);
            handleSelectProject(p);
            setViewMode('ide');
            showNotification(`Created workspace "${p.name}"`, 'success');
          }}
          onImportGitProject={async (data) => {
            const p = await git.importGitProject(data);
            await refreshProjects();
            handleSelectProject(p);
            setViewMode('ide');
            showNotification(`Imported Git workspace "${p.name}"`, 'success');
          }}
          onUpdateProject={async (id, data) => {
            await updateProject(id, data);
            showNotification('Project details updated', 'success');
          }}
          onCloneProject={async (id) => {
            const cloned = await cloneProject(id);
            showNotification(`Cloned to "${cloned.name}"`, 'success');
          }}
          onDeleteProject={async (id) => {
            await deleteProject(id);
            showNotification('Project deleted', 'info');
          }}
          onDownloadZip={async (id, name) => {
            await downloadProjectZip(id, name);
            showNotification(`Downloaded ${name}.zip`, 'success');
          }}
          onRefreshProjects={refreshProjects}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLaunchIDE={(project) => {
            handleSelectProject(project);
            setViewMode('ide');
          }}
          onOpenLanding={() => setViewMode('landing')}
          onOpenBillingModal={() => setIsBillingModalOpen(true)}
          onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        <BillingModal
          isOpen={isBillingModalOpen}
          onClose={() => setIsBillingModalOpen(false)}
          onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        />

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onUpgradeSuccess={(plan) => {
            showNotification(`Successfully upgraded to ${plan.toUpperCase()}!`, 'success');
            refreshProjects();
          }}
        />
      </div>
    );
  }

  // View: Cloud IDE Workspace
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#08090d] text-ide-text select-none">
      {/* 1. Top Navbar */}
      <Navbar
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProjectClick={() => setIsNewProjectModalOpen(true)}
        onImportGitClick={() => setIsImportGitModalOpen(true)}
        onSaveFile={handleSaveActiveFile}
        isDirty={activeTab?.isDirty}
        isSaving={isSaving}
        activeFilePath={activeTabPath}
        isVibeModeActive={isVibeModeActive}
        onToggleVibeMode={toggleVibeMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDashboard={() => setViewMode('dashboard')}
        onOpenBillingModal={() => setIsBillingModalOpen(true)}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
      />

      {/* 2. Toast Notifications */}
      {notification && (
        <div
          className={`fixed bottom-8 right-6 z-50 px-3.5 py-2 rounded-xl text-xs font-medium shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            notification.type === 'error'
              ? 'bg-red-950/90 border-red-500/30 text-red-300'
              : notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-[#121520]/90 border-white/10 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* 3. Main Split IDE Workspace with Activity Bar */}
      <MainLayout
        activityBar={
          <ActivityBar
            activeView={[
              isSidebarOpen ? sidebarView : null,
              isTerminalOpen ? 'terminal' : null,
              isRightPanelOpen ? rightPanelView : null
            ].filter(Boolean)}
            onToggleView={handleToggleActivityView}
            isVibeModeActive={isVibeModeActive}
            onToggleVibeMode={toggleVibeMode}
            onOpenDashboard={() => setViewMode('dashboard')}
            gitChangesCount={git.totalChanges}
          />
        }
        isSidebarOpen={isSidebarOpen}
        isTerminalOpen={isTerminalOpen}
        isRightPanelOpen={isRightPanelOpen}
        sidebar={
          sidebarView === 'git' ? (
            <SourceControlPanel
              git={git}
              onFileSelect={(path) => openFile(currentProject?._id, path)}
            />
          ) : (
            <FileTree
              tree={fileTree}
              activeFilePath={activeTabPath}
              onSelectFile={(path) => openFile(currentProject?._id, path)}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRefresh={() => refreshFileTree(currentProject?._id)}
              isLoading={isLoadingTree}
            />
          )
        }
        editorTabs={
          <EditorTabs
            tabs={tabs}
            activeTabPath={activeTabPath}
            onSelectTab={setActiveTabPath}
            onCloseTab={closeTab}
          />
        }
        editor={
          <CodeEditor
            activeFile={activeTab}
            content={activeContent}
            onChange={(content) => activeTabPath && updateContent(activeTabPath, content)}
            onSave={handleSaveActiveFile}
            isSaving={isSaving}
          />
        }
        terminal={
          <TerminalPanel
            projectId={currentProject?._id}
            isExpanded={!isSidebarOpen && !isRightPanelOpen}
            onToggleExpand={() => setIsTerminalOpen((prev) => !prev)}
          />
        }
        rightPanel={
          <div className="flex flex-col h-full w-full overflow-hidden bg-[#0a0c13]">
            {/* Right Panel Header: Switch between AI Copilot & Live Preview */}
            <div className="flex items-center justify-between border-b border-ide-border bg-[#0d0f18] px-2 pt-1.5 shrink-0 select-none">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRightPanelView('agent')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all ${
                    rightPanelView === 'agent'
                      ? 'bg-[#121522] text-purple-300 border-t-2 border-purple-500 shadow-glow-sm'
                      : 'text-ide-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={13} className={rightPanelView === 'agent' ? 'text-purple-400' : ''} />
                  <span>AI Copilot</span>
                </button>

                <button
                  onClick={() => setRightPanelView('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all ${
                    rightPanelView === 'preview'
                      ? 'bg-[#121522] text-emerald-300 border-t-2 border-emerald-500 shadow-glow-sm'
                      : 'text-ide-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Globe size={13} className={rightPanelView === 'preview' ? 'text-emerald-400' : ''} />
                  <span>Live Preview</span>
                </button>
              </div>

              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="p-1 rounded-md text-ide-muted hover:text-white hover:bg-white/5 transition-colors"
                title="Collapse Panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 w-full h-full overflow-hidden">
              {rightPanelView === 'agent' ? (
                <ChatPanel
                  projectId={currentProject?._id}
                  onClose={() => setIsRightPanelOpen(false)}
                  onFileChanged={() => {
                    refreshFileTree(currentProject?._id);
                    git.refreshStatus();
                  }}
                />
              ) : (
                <PreviewPanel
                  projectId={currentProject?._id}
                  onClose={() => setIsRightPanelOpen(false)}
                />
              )}
            </div>
          </div>
        }
      />

      {/* 4. Bottom Status Bar */}
      <StatusBar
        projectName={currentProject?.name}
        activeLanguage={activeTabPath?.split('.').pop()?.toUpperCase() || 'JAVASCRIPT'}
        isVibeModeActive={isVibeModeActive}
        backendConnected={backendConnected}
        onTogglePreview={() => {
          setIsRightPanelOpen(true);
          setRightPanelView('preview');
        }}
        gitBranch={git.status?.branch || 'main'}
        onToggleGit={() => handleToggleActivityView('git')}
      />

      {/* 5. Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        files={fileTree}
        onOpenFile={(path) => openFile(currentProject?._id, path)}
        onCreateFile={handleCreateFile}
        onCreateProject={() => setIsNewProjectModalOpen(true)}
        onToggleVibeMode={toggleVibeMode}
        onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
        onTogglePreview={() => {
          setIsRightPanelOpen(true);
          setRightPanelView('preview');
        }}
        onOpenGit={() => {
          setIsSidebarOpen(true);
          setSidebarView('git');
          git.refreshStatus();
        }}
        onImportGit={() => setIsImportGitModalOpen(true)}
      />

      {/* 6. Create Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={createProject}
      />

      {/* 7. Import Git Repository Modal */}
      <ImportGitModal
        isOpen={isImportGitModalOpen}
        onClose={() => setIsImportGitModalOpen(false)}
        onImport={async (data) => {
          const p = await git.importGitProject(data);
          await refreshProjects();
          handleSelectProject(p);
          showNotification(`Imported Git workspace "${p.name}"`, 'success');
        }}
      />

      {/* 8. Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 9. Billing & Quotas Modal */}
      <BillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
      />

      {/* 10. Upgrade to Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgradeSuccess={(plan) => {
          showNotification(`Successfully upgraded to ${plan.toUpperCase()}!`, 'success');
          refreshProjects();
        }}
      />
    </div>
  );
}
