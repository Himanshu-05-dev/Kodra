import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export function useProject() {
  const { user, idToken } = useAuth();
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

  // Rename / Update Project
  const updateProject = async (projectId, { name, description }) => {
    const updated = await api.updateProject(projectId, { name, description });
    await refreshProjects();
    if (currentProject?._id === projectId) {
      setCurrentProject(updated);
    }
    return updated;
  };

  // Clone Project
  const cloneProject = async (projectId, { name } = {}) => {
    const cloned = await api.cloneProject(projectId, { name });
    await refreshProjects();
    return cloned;
  };

  // Delete Project
  const deleteProject = async (projectId) => {
    await api.deleteProject(projectId);
    await refreshProjects();
    if (currentProject?._id === projectId) {
      setCurrentProject(null);
      setFileTree(null);
    }
  };

  // Download Project ZIP
  const downloadProjectZip = async (projectId, projectName) => {
    return await api.downloadProjectZip(projectId, projectName);
  };

  // Switch Active Project
  const selectProject = (project) => {
    setCurrentProject(project);
    setFileTree(null);
  };

  // Initial Boot: Check health
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // When user or auth token changes, refresh projects
  useEffect(() => {
    refreshProjects().then((projs) => {
      if (projs && projs.length > 0) {
        setCurrentProject((prev) => {
          if (prev && projs.some((p) => p._id === prev._id)) {
            return prev;
          }
          return projs[0];
        });
      } else {
        setCurrentProject(null);
        setFileTree(null);
      }
    });
  }, [user?.uid, idToken, refreshProjects]);

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
    updateProject,
    cloneProject,
    deleteProject,
    downloadProjectZip,
    selectProject,
    refreshProjects,
    refreshFileTree
  };
}
