/**
 * @file useGit.js
 * React hook for Git version control operations in Kodra IDE.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

export function useGit(projectId) {
  const [status, setStatus] = useState(null);
  const [branches, setBranches] = useState([]);
  const [history, setHistory] = useState([]);
  const [diff, setDiff] = useState(null);
  const [selectedDiffFile, setSelectedDiffFile] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Refresh Git Status
  const refreshStatus = useCallback(async () => {
    if (!projectId) return null;
    try {
      setIsLoading(true);
      const data = await api.getGitStatus(projectId);
      setStatus(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Refresh Branches
  const refreshBranches = useCallback(async () => {
    if (!projectId) return [];
    try {
      const data = await api.getGitBranches(projectId);
      setBranches(data || []);
      return data;
    } catch (err) {
      console.warn('Failed to fetch Git branches:', err.message);
      return [];
    }
  }, [projectId]);

  // Refresh Commit History
  const refreshHistory = useCallback(async (limit = 15) => {
    if (!projectId) return [];
    try {
      const data = await api.getGitHistory(projectId, limit);
      setHistory(data || []);
      return data;
    } catch (err) {
      console.warn('Failed to fetch Git history:', err.message);
      return [];
    }
  }, [projectId]);

  // Fetch Diff for single file or all files
  const fetchDiff = useCallback(async ({ staged = false, filePath = null } = {}) => {
    if (!projectId) return null;
    try {
      setIsDiffLoading(true);
      setSelectedDiffFile(filePath);
      const data = await api.getGitDiff(projectId, { staged, filePath });
      setDiff(data);
      return data;
    } catch (err) {
      console.warn('Failed to fetch Git diff:', err.message);
      return null;
    } finally {
      setIsDiffLoading(false);
    }
  }, [projectId]);

  // Stage files
  const stageFiles = useCallback(async (files = []) => {
    if (!projectId) return null;
    try {
      setIsLoading(true);
      const updatedStatus = await api.stageGitFiles(projectId, files);
      setStatus(updatedStatus);
      return updatedStatus;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Unstage files
  const unstageFiles = useCallback(async (files = []) => {
    if (!projectId) return null;
    try {
      setIsLoading(true);
      const updatedStatus = await api.unstageGitFiles(projectId, files);
      setStatus(updatedStatus);
      return updatedStatus;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Stage all changes
  const stageAll = useCallback(async () => {
    return stageFiles(['.']);
  }, [stageFiles]);

  // Commit
  const commit = useCallback(async ({ message, stageAll = false }) => {
    if (!projectId) return null;
    try {
      setIsCommitting(true);
      const result = await api.commitGit(projectId, { message, stageAll });
      await Promise.all([refreshStatus(), refreshHistory()]);
      setDiff(null);
      setSelectedDiffFile(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsCommitting(false);
    }
  }, [projectId, refreshStatus, refreshHistory]);

  // Checkout or Create Branch
  const checkoutBranch = useCallback(async ({ branch, create = false }) => {
    if (!projectId) return null;
    try {
      setIsLoading(true);
      const result = await api.checkoutGitBranch(projectId, { branch, create });
      await Promise.all([refreshStatus(), refreshBranches()]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, refreshStatus, refreshBranches]);

  // Generate Commit Message with AI
  const generateCommitMessage = useCallback(async () => {
    if (!projectId) return '';
    try {
      setIsAiGenerating(true);
      const res = await api.generateGitCommitMessage(projectId);
      return res?.message || 'feat: update workspace files';
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAiGenerating(false);
    }
  }, [projectId]);

  // Import Git Repository
  const importGitProject = useCallback(async (importData) => {
    try {
      setIsLoading(true);
      const newProject = await api.importGitProject(importData);
      return newProject;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load status & branches on project change
  useEffect(() => {
    if (projectId) {
      refreshStatus();
      refreshBranches();
      refreshHistory();
    } else {
      setStatus(null);
      setBranches([]);
      setHistory([]);
      setDiff(null);
      setSelectedDiffFile(null);
    }
  }, [projectId, refreshStatus, refreshBranches, refreshHistory]);

  const totalChanges =
    (status?.staged?.length || 0) +
    (status?.unstaged?.length || 0) +
    (status?.untracked?.length || 0);

  return {
    status,
    branches,
    history,
    diff,
    selectedDiffFile,
    isLoading,
    isDiffLoading,
    isCommitting,
    isAiGenerating,
    error,
    totalChanges,
    refreshStatus,
    refreshBranches,
    refreshHistory,
    fetchDiff,
    stageFiles,
    unstageFiles,
    stageAll,
    commit,
    checkoutBranch,
    generateCommitMessage,
    importGitProject,
    clearDiff: () => {
      setDiff(null);
      setSelectedDiffFile(null);
    }
  };
}
