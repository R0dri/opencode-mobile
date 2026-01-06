/**
 * Project and session management utility for opencode projects
 * Handles fetching projects, filtering sessions, and project/session selection
 */


import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/services/api/client';
import { logger } from '@/shared';

/**
 * Get common headers for all API requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @param {Object} selectedProject - Currently selected project
 * @returns {Object} - Headers object with x-opencode-directory
 */


/**
 * Fetch all available projects from the server
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<Array<import('../../types/project.types.js').Project>>} - Array of projects
 */
export const fetchProjects = async (baseUrl, selectedProject = null) => {
  try {
    const response = await apiClient.get(`${baseUrl}/project`, {
      headers: {
        'Accept': 'application/json'
      }
    }, selectedProject);

    /** @type {Array<import('../../types/project.types.js').Project>} */
    const projects = await apiClient.parseJSON(response);

    return projects;
  } catch (error) {
    logger.error('Project fetch failed', error);
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


/**
 * Fetch all sessions for a specific project
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {string} projectId - Project ID to filter sessions
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<Array<import('@/shared/types/opencode.types.js').Session>>} - Array of sessions for the project
 */
export const fetchSessionsForProject = async (baseUrl, projectId, selectedProject = null) => {
  try {
    const response = await apiClient.get(`${baseUrl}/session`, {
      headers: {
        'Accept': 'application/json'
      }
    }, selectedProject);

    /** @type {Array<import('@/shared/types/opencode.types.js').Session>} */
    const projectSessions = await apiClient.parseJSON(response);

    return projectSessions;
  } catch (error) {
    logger.error('Session fetch failed', error);
    throw error;
  }
};



/**
 * Fetch session statuses for all sessions
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<Object>} - Object mapping session IDs to status objects {type: "busy"|"idle"}
 */
export const fetchSessionStatuses = async (baseUrl, selectedProject = null) => {
  try {
    const response = await apiClient.get(`${baseUrl}/session/status`, {
      headers: {
        'Accept': 'application/json'
      }
    }, selectedProject);

    /** @type {Object} */
    const statuses = await apiClient.parseJSON(response);

    return statuses;
  } catch (error) {
    logger.error('Session statuses fetch failed', error);
    // Return empty object instead of throwing to prevent app crashes
    return {};
  }
};





// Export empty object to make this a valid module
export {};