/**
 * Session management utility for opencode chat sessions
 * Handles session creation, storage, and retrieval
 */

import { apiClient } from '@/services/api/client';
import { logger } from '@/shared';


/**
 * Get common headers for all API requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @param {Object} selectedProject - Currently selected project
 * @returns {Object} - Headers object with x-opencode-directory
 */


// In-memory session storage (can be expanded to persistent storage later)
/** @type {import('@/shared/types/opencode.types.js').Session|null} */
let currentSession = null;
/** @type {string|null} */
let baseUrl = null;

/**
 * Create a new chat session
 * @param {string} serverBaseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project
 * @returns {Promise<import('@/shared/types/opencode.types.js').Session>} - Session object
 */
export const createSession = async (serverBaseUrl, selectedProject = null) => {
  try {
    const response = await apiClient.post(`${serverBaseUrl}/session`, null, {
      headers: {
        'Accept': 'application/json'
      }
    }, selectedProject);

    /** @type {import('@/shared/types/opencode.types.js').Session} */
    const session = await apiClient.parseJSON(response);

    if (!session.id) {
      throw new Error('Invalid session response: missing session id');
    }

    currentSession = session;
    baseUrl = serverBaseUrl;

    return session;
  } catch (error) {
    logger.error('Session creation failed', error);
    throw error;
  }
};

/**
 * Get the current active session
 * @returns {import('@/shared/types/opencode.types.js').Session|null} - Current session or null if no session
 */
export const getCurrentSession = () => {
  return currentSession;
};

/**
 * Get the current active session ID
 * @returns {string|null} - Current session ID or null if no session
 */
export const getCurrentSessionId = () => {
  return currentSession?.id || null;
};

/**
 * Check if a session is currently active
 * @returns {boolean} - True if session exists
 */
export const hasActiveSession = () => {
  return currentSession !== null;
};

/**
 * Set an existing session as the current session
 * @param {import('@/shared/types/opencode.types.js').Session} session - Session to set as current
 * @param {string} serverBaseUrl - Base URL of the server
 */
export const setCurrentSession = (session, serverBaseUrl) => {

  currentSession = session;
  baseUrl = serverBaseUrl;
};

/**
 * Clear the current session (for logout/disconnect)
 */
export const clearSession = () => {

  currentSession = null;
  baseUrl = null;
};

/**
 * Get the base URL for the current session
 * @returns {string|null} - Base URL or null if no session
 */
export const getSessionBaseUrl = () => {
  return baseUrl;
};

/**
 * Send a message to the current session
 * @param {string} messageText - The message text to send
 * @param {string} mode - Message mode ('build' or 'plan')
 * @param {Object} selectedProject - Currently selected project
 * @param {Object} selectedModel - Selected model info
 * @param {boolean} async - Whether to send asynchronously (default: false)
 * @returns {Promise<import('@/shared/types/opencode.types.js').SessionMessageResponse|boolean>} - Server response for sync, boolean for async
 */
export const sendMessageToSession = async (messageText, mode = 'build', selectedProject = null, selectedModel = null, async = false) => {
  if (!currentSession || !baseUrl) {
    throw new Error('No active session. Please connect first.');
  }

  // Validate parameters
  if (!selectedProject) {
    throw new Error('No project selected for message');
  }

  if (!selectedProject.worktree && !selectedProject.directory) {
    throw new Error('Selected project missing worktree or directory path');
  }

  if (!currentSession.id || typeof currentSession.id !== 'string') {
    throw new Error(`Invalid session ID: ${currentSession.id}`);
  }

   const endpoint = async ? 'prompt_async' : 'message';
   const messageUrl = `${baseUrl}/session/${currentSession.id}/${endpoint}`;

  /** @type {import('@/shared/types/opencode.types.js').SessionMessageRequest} */
   const messageBody = {
     agent: mode,
     parts: [{ type: 'text', text: messageText }]
   };

    // Add model information if selected
    if (selectedModel) {
      messageBody.model = {
        providerID: selectedModel.providerId,
        modelID: selectedModel.modelId
      };
    }

     logger.emoji('📤', `Sending ${async ? 'async' : 'sync'} message with context:`, {
       sessionId: currentSession.id,
       projectPath: selectedProject?.worktree || selectedProject?.directory,
       messageUrl,
       messageBody,
       selectedModel: selectedModel ? `${selectedModel.providerId}/${selectedModel.modelId}` : 'none'
     });

   try {
     const response = await apiClient.post(messageUrl, messageBody, {}, selectedProject);

     if (async) {
       // Async endpoint returns 204 No Content, no JSON to parse
       logger.emoji('✅', 'Async message sent successfully');
       return true;
     } else {
       // Sync endpoint returns message data
       /** @type {import('@/shared/types/opencode.types.js').SessionMessageResponse} */
       const data = await apiClient.parseJSON(response);
       logger.emoji('✅', 'Message sent successfully', data);
       return data;
     }
   } catch (error) {
     logger.error('Message send failed', error);
     throw error;
   }
};

/**
 * Delete a session
 * @param {string} sessionId - ID of the session to delete
 * @param {string} serverBaseUrl - Base URL of the server
 * @param {Object} selectedProject - Currently selected project (for headers)
 * @returns {Promise<boolean>} - Success status
 */
export const deleteSession = async (sessionId, serverBaseUrl, selectedProject = null) => {
  try {
    const response = await apiClient.delete(`${serverBaseUrl}/session/${sessionId}`, {
      headers: {
        'Accept': 'application/json'
      }
    }, selectedProject);

    // If we deleted the current session, clear it
    if (currentSession && currentSession.id === sessionId) {
      currentSession = null;
    }

    logger.emoji('✅', 'Session deleted successfully', sessionId);
    return true;
  } catch (error) {
    logger.error('Session deletion failed', error);
    throw error;
  }
};

/**
 * Get session info for debugging
 * @returns {Object} - Session information
 */
export const getSessionInfo = () => {
  return {
    session: currentSession,
    sessionId: currentSession?.id || null,
    baseUrl: baseUrl,
    hasActiveSession: hasActiveSession()
  };
};