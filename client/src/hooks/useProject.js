import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

export function useProject() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [fileTree, setFileTree] = useState(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [error, setError] = useState(null);

  // Check Backend Health
  const checkHealth = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setBackendConnected(health?.database?.isConnected ?? true);
      return true;
    } catch {
      setBackendConnected(false);
      return false;
    }
  }, []);

  // Fetch Project List
  const refreshProjects = useCallback(async () => {
    try {
      const data = await api.listProjects();
      setProjects(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  // Fetch File Tree for Current Project
  const refreshFileTree = useCallback(async (projectId = currentProject?._id) => {
    if (!projectId) return;

    try {
      setIsLoadingTree(true);
      const tree = await api.getProjectFiles(projectId);
      setFileTree(tree);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingTree(false);
    }
  }, [currentProject?._id]);

  // Create Project
  const createProject = async ({ name, template, description }) => {
    const newProj = await api.createProject({ name, template, description });
    await refreshProjects();
    setCurrentProject(newProj);
    return newProj;
  };

  // Switch Active Project
  const selectProject = (project) => {
    setCurrentProject(project);
    setFileTree(null);
  };

  // Initial Boot: Check health, list projects, auto-select first project
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    refreshProjects().then((projs) => {
      if (projs && projs.length > 0) {
        setCurrentProject(projs[0]);
      }
    });

    return () => clearInterval(interval);
  }, [checkHealth, refreshProjects]);

  // When currentProject changes, load its file tree
  useEffect(() => {
    if (currentProject?._id) {
      refreshFileTree(currentProject._id);
    }
  }, [currentProject?._id, refreshFileTree]);

  return {
    projects,
    currentProject,
    fileTree,
    isLoadingTree,
    backendConnected,
    error,
    createProject,
    selectProject,
    refreshProjects,
    refreshFileTree
  };
}
