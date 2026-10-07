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
import { NewProjectModal } from './components/Layout/NewProjectModal.jsx';
import { CommandPalette } from './components/Layout/CommandPalette.jsx';
import { useProject } from './hooks/useProject.js';
import { useEditor } from './hooks/useEditor.js';
import { useVibeMode } from './hooks/useVibeMode.js';
import { api } from './services/api.js';

export function App() {
  const {
    projects,
    currentProject,
    fileTree,
    isLoadingTree,
    backendConnected,
    createProject,
    selectProject,
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

  // Layout View States
  const [activeActivityView, setActiveActivityView] = useState('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Activity Bar Toggle Handler
  const handleToggleActivityView = (view) => {
    if (view === 'files') {
      setIsSidebarOpen((prev) => !prev);
      setActiveActivityView((prev) => (prev === 'files' ? null : 'files'));
    } else if (view === 'terminal') {
      setIsTerminalOpen((prev) => !prev);
    } else if (view === 'agent' || view === 'preview') {
      setIsChatOpen((prev) => !prev);
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

  // If no projects exist and backend is connected, prompt project creation
  useEffect(() => {
    if (backendConnected && projects.length === 0 && !currentProject) {
      setIsNewProjectModalOpen(true);
    }
  }, [backendConnected, projects.length, currentProject]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#08090d] text-ide-text select-none">
      {/* 1. Top Navbar */}
      <Navbar
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onCreateProjectClick={() => setIsNewProjectModalOpen(true)}
        onSaveFile={handleSaveActiveFile}
        isDirty={activeTab?.isDirty}
        isSaving={isSaving}
        activeFilePath={activeTabPath}
        isVibeModeActive={isVibeModeActive}
        onToggleVibeMode={toggleVibeMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
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
            activeView={isSidebarOpen ? activeActivityView : null}
            onToggleView={handleToggleActivityView}
            isVibeModeActive={isVibeModeActive}
            onToggleVibeMode={toggleVibeMode}
          />
        }
        isSidebarOpen={isSidebarOpen}
        isTerminalOpen={isTerminalOpen}
        isChatOpen={isChatOpen}
        sidebar={
          <FileTree
            tree={fileTree}
            activeFilePath={activeTabPath}
            onSelectFile={(path) => openFile(currentProject?._id, path)}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRefresh={() => refreshFileTree(currentProject?._id)}
            isLoading={isLoadingTree}
          />
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
            isExpanded={!isSidebarOpen && !isChatOpen}
            onToggleExpand={() => setIsTerminalOpen((prev) => !prev)}
          />
        }
        chatPanel={
          <ChatPanel
            projectId={currentProject?._id}
            onClose={() => setIsChatOpen(false)}
            onFileChanged={() => refreshFileTree(currentProject?._id)}
          />
        }
      />

      {/* 4. Bottom Status Bar */}
      <StatusBar
        projectName={currentProject?.name}
        activeLanguage={activeTabPath?.split('.').pop()?.toUpperCase() || 'JAVASCRIPT'}
        isVibeModeActive={isVibeModeActive}
        backendConnected={backendConnected}
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
      />

      {/* 6. Create Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={createProject}
      />
    </div>
  );
}
