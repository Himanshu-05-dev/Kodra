import { useState, useCallback } from 'react';
import { api } from '../services/api.js';

export function useEditor() {
  const [tabs, setTabs] = useState([]); // [{ path, isDirty }]
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [fileContents, setFileContents] = useState({}); // { [path]: string }
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState(null);

  // Open a file into tabs
  const openFile = useCallback(async (projectId, relativePath) => {
    if (!projectId || !relativePath) return;

    // 1. Check if tab is already open
    const existing = tabs.find((t) => t.path === relativePath);
    if (existing) {
      setActiveTabPath(relativePath);
      return;
    }

    try {
      // 2. Fetch content from backend if not already cached
      let content = fileContents[relativePath];
      if (content === undefined) {
        const fileData = await api.getFileContent(projectId, relativePath);
        content = fileData?.content ?? '';
        setFileContents((prev) => ({ ...prev, [relativePath]: content }));
      }

      // 3. Add to tabs & set as active
      setTabs((prev) => [...prev, { path: relativePath, isDirty: false }]);
      setActiveTabPath(relativePath);
      setEditorError(null);
    } catch (err) {
      setEditorError(`Failed to open "${relativePath}": ${err.message}`);
    }
  }, [tabs, fileContents]);

  // Update in-memory content on user typing
  const updateContent = useCallback((relativePath, newContent) => {
    setFileContents((prev) => ({ ...prev, [relativePath]: newContent }));
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === relativePath ? { ...tab, isDirty: true } : tab
      )
    );
  }, []);

  // Save active or specified file to backend
  const saveFile = useCallback(async (projectId, targetPath = activeTabPath) => {
    if (!projectId || !targetPath) return false;

    const content = fileContents[targetPath] ?? '';

    try {
      setIsSaving(true);
      await api.saveFileContent(projectId, targetPath, content);

      // Mark tab as clean
      setTabs((prev) =>
        prev.map((tab) =>
          tab.path === targetPath ? { ...tab, isDirty: false } : tab
        )
      );
      setEditorError(null);
      return true;
    } catch (err) {
      setEditorError(`Save error: ${err.message}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeTabPath, fileContents]);

  // Close tab with dirty check
  const closeTab = useCallback((targetPath) => {
    const tabToClose = tabs.find((t) => t.path === targetPath);
    if (tabToClose?.isDirty) {
      const confirmClose = window.confirm(`File "${targetPath}" has unsaved changes. Discard changes?`);
      if (!confirmClose) return;
    }

    const nextTabs = tabs.filter((t) => t.path !== targetPath);
    setTabs(nextTabs);

    if (activeTabPath === targetPath) {
      // Focus adjacent tab or null
      const closedIndex = tabs.findIndex((t) => t.path === targetPath);
      const nextActive = nextTabs[closedIndex] || nextTabs[closedIndex - 1] || null;
      setActiveTabPath(nextActive ? nextActive.path : null);
    }
  }, [tabs, activeTabPath]);

  // Clear all tabs when switching projects
  const resetTabs = useCallback(() => {
    setTabs([]);
    setActiveTabPath(null);
    setFileContents({});
  }, []);

  const activeTab = tabs.find((t) => t.path === activeTabPath) || null;
  const activeContent = activeTabPath ? (fileContents[activeTabPath] ?? '') : '';

  return {
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
  };
}
