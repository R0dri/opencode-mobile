// Project and session management
import { useState, useCallback, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import { storage } from "../../../services/storage/asyncStorage";

export const useProjectManager = (baseUrl) => {
  const [projects, setProjects] = useState([]);
  const [projectSessions, setProjectSessions] = useState([]);
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Auto-load projects when baseUrl is set
  useEffect(() => {
    if (baseUrl) {
      loadProjects();
    }
  }, [baseUrl]);

  // Auto-load sessions when baseUrl and selectedProject are available
  useEffect(() => {
    if (baseUrl && selectedProject) {
      refreshProjectSessions();
    }
  }, [baseUrl, selectedProject]);

  // Unified refresh function for sessions and statuses
  const refreshProjectSessions = useCallback(
    async (project = selectedProject) => {
      if (!baseUrl || !project?.id) {
        return;
      }

      try {
        console.log(
          "Refreshing project sessions and statuses for project:",
          project.id,
        );

        // Fetch sessions (already filtered by project via header)
        const sessionResponse = await apiClient.get(
          `${baseUrl}/session`,
          {},
          project,
        );
        const projectSessions = await apiClient.parseJSON(sessionResponse);
        console.log(
          "Project sessions fetched:",
          projectSessions.length,
          "sessions for project",
          project.id,
        );
        setProjectSessions(projectSessions);

        // Fetch statuses
        const statusResponse = await apiClient.get(
          `${baseUrl}/session/status`,
          {},
          project,
        );
        const statuses = await apiClient.parseJSON(statusResponse);
        console.log("Session statuses:", statuses);
        setSessionStatuses(statuses || {});
      } catch (error) {
        console.error("Failed to refresh project sessions:", error);
        setProjectSessions([]);
        setSessionStatuses({});
      }
    },
    [baseUrl, selectedProject],
  );

  // Load all projects
  const loadProjects = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    try {
      console.log("Loading projects from:", `${baseUrl}/project`);
      const response = await apiClient.get(`${baseUrl}/project`);
      const data = await apiClient.parseJSON(response);
      console.log("Projects API response:", data);
      const projectsData = data.projects || data;
      console.log("Projects data extracted:", projectsData);
      const newProjects = Array.isArray(projectsData) ? projectsData : [];
      setProjects(newProjects);
      console.log("Projects set to:", newProjects);
      // Force a check
      setTimeout(
        () => console.log("After setTimeout, projects state:", projects),
        0,
      );
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Select a project and load its sessions
  const selectProject = useCallback(
    async (project) => {
      setSessionLoading(true);
      setSelectedProject(project);
      setSelectedSession(null); // Clear session selection

      // Save selected project
      if (project) {
        await storage.set("lastSelectedProject", project);
      } else {
        await storage.remove("lastSelectedProject");
        await storage.remove("lastSelectedSession"); // Clear session if project cleared
      }

       if (project) {
         setLoading(true);
         try {
           if (baseUrl) {
             await refreshProjectSessions(project);
           }
         } catch (error) {
           console.error("Failed to load project sessions:", error);
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
    [],
  );

  // Select a session
  const selectSession = useCallback(
    async (session) => {
      setSelectedSession(session);

      // Save selected session
      if (session) {
        await storage.set("lastSelectedSession", session);
      } else {
        await storage.remove("lastSelectedSession");
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
      throw new Error("No project selected");
    }

    try {
      const response = await apiClient.post(
        `${baseUrl}/session`,
        {},
        {},
        selectedProject,
      );
      const newSession = await apiClient.parseJSON(response);

      // Add to project sessions
      setProjectSessions((prev) => [newSession, ...prev]);
      setSelectedSession(newSession);

      return newSession;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    }
  }, [selectedProject, baseUrl]);

  // Delete session
  const deleteSession = useCallback(
    async (sessionId) => {
      if (!baseUrl) {
        throw new Error("No base URL available");
      }

      try {
        await apiClient.delete(
          `${baseUrl}/session/${sessionId}`,
          {},
          selectedProject,
        );

        // Remove from project sessions
        setProjectSessions((prev) =>
          prev.filter((session) => session.id !== sessionId),
        );

        // Clear selection if deleted session was selected
        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession(null);
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
        throw error;
      }
    },
    [baseUrl, selectedSession],
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
