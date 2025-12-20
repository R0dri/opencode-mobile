/**
 * Project and session management utility for opencode projects
 * Handles fetching projects, filtering sessions, and project/session selection
 */

import './opencode-types.js';

/**
 * Fetch all available projects from the server
 * @param {string} baseUrl - Base URL of the opencode server
 * @returns {Promise<Array<import('./opencode-types.js').Project>>} - Array of projects
 */
export const fetchProjects = async (baseUrl) => {
  try {


    const response = await fetch(`${baseUrl}/project`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }

    /** @type {Array<import('./opencode-types.js').Project>} */
    const projects = await response.json();

    return projects;
  } catch (error) {
    console.error('❌ Project fetch failed:', error);
    throw error;
  }
};

/**
 * Fetch all sessions for a specific project
 * @param {string} baseUrl - Base URL of the opencode server
 * @param {string} projectId - Project ID to filter sessions
 * @returns {Promise<Array<import('./opencode-types.js').Session>>} - Array of sessions for the project
 */
export const fetchSessionsForProject = async (baseUrl, projectId) => {
  try {


    const response = await fetch(`${baseUrl}/session`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
    }

    /** @type {Array<import('./opencode-types.js').Session>} */
    const allSessions = await response.json();

    // Filter sessions by project ID
    const projectSessions = allSessions.filter(session => session.projectID === projectId);

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
 * @param {import('./opencode-types.js').Session} session - Session object
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

// Export empty object to make this a valid module
export {};