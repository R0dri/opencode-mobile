// Project and session management
import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/shared/services/api/client';
import { storage } from '@/shared/services/storage';
import { logger } from '@/shared/services/logger';

const projectLogger = logger.tag('Project');
const sessionLogger = logger.tag('Session');

export const useProjectManager = baseUrl => {
  const [projects, setProjects] = useState([]);
  const [projectSessions, setProjectSessions] = useState([]);
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const refreshProjectSessions = useCallback(
    async (project = selectedProject) => {
      if (!baseUrl || !project?.id) {
        return;
      }

      try {
        projectLogger.debug('Refreshing project sessions and statuses', { projectId: project.id });

        // Fetch sessions (already filtered by project via header)
        const sessionResponse = await apiClient.get(`${baseUrl}/session`, {}, project);
        const projectSessions = await apiClient.parseJSON(sessionResponse);
        const validSessions = projectSessions.filter(
          session =>
            session && typeof session === 'object' && session.id && typeof session.id === 'string',
        );
        projectLogger.debug('Project sessions fetched', {
          count: validSessions.length,
          projectId: project.id,
        });
        setProjectSessions(validSessions);

        // Fetch statuses
        const statusResponse = await apiClient.get(`${baseUrl}/session/status`, {}, project);
        const statuses = await apiClient.parseJSON(statusResponse);
        sessionLogger.debug('Session statuses fetched', {
          count: Object.keys(statuses || {}).length,
        });
        setSessionStatuses(statuses || {});
      } catch (error) {
        projectLogger.error('Failed to refresh project sessions', error);
        setProjectSessions([]);
        setSessionStatuses({});
      }
    },
    [baseUrl, selectedProject],
  );

  const loadProjects = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    try {
      projectLogger.debug('Loading projects', { url: `${baseUrl}/project` });
      const response = await apiClient.get(`${baseUrl}/project`);
      if (!response) {
        projectLogger.warn('Failed to load projects - no response');
        setProjects([]);
        return;
      }
      const data = await apiClient.parseJSON(response);
      if (!data) {
        projectLogger.warn('Failed to load projects - no data');
        setProjects([]);
        return;
      }
      const projectsData = data.projects || data;
      const newProjects = Array.isArray(projectsData) ? projectsData : [];
      setProjects(newProjects);
      projectLogger.debug('Projects loaded', { count: newProjects.length });
    } catch (error) {
      projectLogger.warn('Failed to load projects', { error: error.message });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (baseUrl) {
      loadProjects();
    }
  }, [baseUrl, loadProjects]);

  useEffect(() => {
    if (baseUrl && selectedProject) {
      refreshProjectSessions();
    }
  }, [baseUrl, selectedProject, refreshProjectSessions]);

  const selectProject = useCallback(
    async project => {
      setSessionLoading(true);
      setSelectedProject(project);
      setSelectedSession(null);

      if (project) {
        await storage.set('lastSelectedProject', project);
      } else {
        await storage.remove('lastSelectedProject');
        await storage.remove('lastSelectedSession');
      }

      if (project) {
        setLoading(true);
        try {
          if (baseUrl) {
            await refreshProjectSessions(project);
          }
        } catch (error) {
          projectLogger.error('Failed to load project sessions', error);
          setProjectSessions([]);
          setSessionStatuses({});
        } finally {
          setLoading(false);
        }
      } else {
        setProjectSessions([]);
        setSessionStatuses({});
      }
      setSessionLoading(false);
    },
    [baseUrl, refreshProjectSessions],
  );

  // Select a session
  const selectSession = useCallback(
    async session => {
      if (session && (!session.id || typeof session.id !== 'string')) {
        sessionLogger.warn('Invalid session selected', session);
        return;
      }
      setSelectedSession(session);

      // Save selected session
      if (session) {
        await storage.set('lastSelectedSession', session);
      } else {
        await storage.remove('lastSelectedSession');
      }

      // Refresh sessions and statuses when selecting a session (not clearing)
      if (session && selectedProject) {
        setSessionLoading(true);
        try {
          await refreshProjectSessions(selectedProject);
        } finally {
          setSessionLoading(false);
        }
      }
    },
    [selectedProject, refreshProjectSessions],
  );

  // Create new session
  const createSession = useCallback(async () => {
    if (!selectedProject || !baseUrl) {
      throw new Error('No project selected');
    }

    try {
      const response = await apiClient.post(`${baseUrl}/session`, {}, {}, selectedProject);
      const newSession = await apiClient.parseJSON(response);

      // Add to project sessions
      setProjectSessions(prev => [newSession, ...prev]);
      setSelectedSession(newSession);

      return newSession;
    } catch (error) {
      projectLogger.error('Failed to create session', error);
      throw error;
    }
  }, [selectedProject, baseUrl]);

  const deleteSession = useCallback(
    async sessionId => {
      if (!baseUrl) {
        throw new Error('No base URL available');
      }

      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error(`Invalid sessionId: expected string, got ${typeof sessionId}`);
      }

      try {
        await apiClient.delete(`${baseUrl}/session/${sessionId}`, {}, selectedProject);

        setProjectSessions(prev => prev.filter(session => session.id !== sessionId));

        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession(null);
        }
      } catch (error) {
        projectLogger.error('Failed to delete session', error);
        throw error;
      }
    },
    [baseUrl, selectedProject, selectedSession],
  );

  return {
    projects,
    projectSessions,
    sessionStatuses,
    selectedProject,
    selectedSession,
    loading,
    sessionLoading,
    loadProjects,
    selectProject,
    selectSession,
    createSession,
    deleteSession,
    refreshProjectSessions,
  };
};
