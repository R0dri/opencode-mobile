/**
 * Project and session management utility for opencode projects
 * Handles fetching projects, filtering sessions, and project/session selection
 */


import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get common headers for all API requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @param {Object} selectedProject - Currently selected project
 * @returns {Object} - Headers object with x-opencode-directory
 */
const getRequestHeaders = (additionalHeaders = {}, selectedProject = null) => {
  const getProjectPath = (selectedProject = null) => {
    // Use selected project's directory/worktree path
    if (selectedProject && selectedProject.worktree) {
      return selectedProject.worktree;
    }
    if (selectedProject && selectedProject.directory) {
      return selectedProject.directory;
    }
    // Fallback to current app directory if no project selected
    return '/Users/rodri/Projects/opencode-mobile/opencode-mobile';
  };

  return {
    'x-opencode-directory': getProjectPath(selectedProject),
    'Accept': 'application/json',
    ...additionalHeaders
  };
};

/**
 * Fetch all available projects from the server
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<Array<import('../../types/project.types.js').Project>>} - Array of projects
 */
export const fetchProjects = async (baseUrl, selectedProject = null) => {
  try {


    const response = await fetch(`${baseUrl}/project`, {
      method: 'GET',
      headers: getRequestHeaders({
        'Accept': 'application/json'
      }, selectedProject)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
    }

    /** @type {Array<import('../../types/project.types.js').Project>} */
    const projects = await response.json();

    return projects;
  } catch (error) {
    console.error('❌ Project fetch failed:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

/**
 * Fetch available models and providers from the server
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<{providers: Array, defaults: Object}>} - Available providers and default models
 */
export const fetchModels = async (baseUrl, selectedProject = null) => {
  try {
    const response = await fetch(`${baseUrl}/config/providers`, {
      method: 'GET',
      headers: getRequestHeaders({
        'Accept': 'application/json'
      }, selectedProject)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // If not JSON, return empty to avoid errors
      console.warn('Warning: Model fetch returned non-JSON, using empty providers');
      return {
        providers: [],
        defaults: {}
      };
    }

    /** @type {{providers: Array, default: Object}} */
    const data = await response.json();

    // Handle the /config/providers response format: { providers: [...], default: {...} }
    return {
      providers: data.providers || [],
      defaults: data.default || {}
    };
  } catch (error) {
    console.error('❌ Model fetch failed:', error);
    // Return empty providers instead of throwing to prevent app crashes
    return {
      providers: [],
      defaults: {}
    };
  }
};

/**
 * Fetch all sessions for a specific project
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {string} projectId - Project ID to filter sessions
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<Array<import('../../../../shared/types/opencode.types.js').Session>>} - Array of sessions for the project
 */
export const fetchSessionsForProject = async (baseUrl, projectId, selectedProject = null) => {
  try {


    const response = await fetch(`${baseUrl}/session`, {
      method: 'GET',
      headers: getRequestHeaders({
        'Accept': 'application/json'
      }, selectedProject)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
    }

    /** @type {Array<import('../../../../shared/types/opencode.types.js').Session>} */
    const projectSessions = await response.json();

    return projectSessions;
  } catch (error) {
    console.error('❌ Session fetch failed:', error);
    throw error;
  }
};

/**
 * Get project display name from worktree path
 * @param {string} worktree - Worktree path
 * @returns {string} - Display name
 */
export const getProjectDisplayName = (worktree) => {
  if (!worktree) return 'Unknown Project';

  // Extract last part of path
  const parts = worktree.split('/').filter(part => part.trim().length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : 'Unknown Project';
};

/**
 * Get session summary text for display
 * @param {import('../../../../shared/types/opencode.types.js').Session} session - Session object
 * @returns {string} - Summary text
 */
export const getSessionSummaryText = (session) => {
  if (!session.summary) return '';

  const { additions, deletions, files } = session.summary;
  const parts = [];

  if (additions > 0) parts.push(`+${additions}`);
  if (deletions > 0) parts.push(`-${deletions}`);
  if (files > 0) parts.push(`${files} files`);

  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
};

/**
 * Fetch session statuses for all sessions
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<Object>} - Object mapping session IDs to status objects {type: "busy"|"idle"}
 */
export const fetchSessionStatuses = async (baseUrl, selectedProject = null) => {
  try {
    const response = await fetch(`${baseUrl}/session/status`, {
      method: 'GET',
      headers: getRequestHeaders({
        'Accept': 'application/json'
      }, selectedProject)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session statuses: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
    }

    /** @type {Object} */
    const statuses = await response.json();

    return statuses;
  } catch (error) {
    console.error('❌ Session statuses fetch failed:', error);
    // Return empty object instead of throwing to prevent app crashes
    return {};
  }
};

/**
 * Format session timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date string
 */
export const formatSessionDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Save the last selected model to AsyncStorage
 * @param {string} providerId - Provider ID
 * @param {string} modelId - Model ID
 */
export const saveLastSelectedModel = async (providerId, modelId) => {
  try {
    const modelData = { providerId, modelId, timestamp: Date.now() };
    await AsyncStorage.setItem('lastSelectedModel', JSON.stringify(modelData));
    console.log('💾 Saved last selected model:', modelData);
  } catch (error) {
    console.error('❌ Failed to save last selected model:', error);
  }
};

/**
 * Load the last selected model from AsyncStorage
 * @returns {Promise<{providerId: string, modelId: string}|null>} - Last selected model or null
 */
export const loadLastSelectedModel = async () => {
  try {
    const modelData = await AsyncStorage.getItem('lastSelectedModel');
    if (modelData) {
      const parsed = JSON.parse(modelData);
      console.log('📚 Loaded last selected model:', parsed);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to load last selected model:', error);
    return null;
  }
};

// Export empty object to make this a valid module
export {};