/**
 * Session management utility for opencode chat sessions
 * Handles session creation, storage, and retrieval
 */


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

// In-memory session storage (can be expanded to persistent storage later)
/** @type {import('../../../../shared/types/opencode.types.js').Session|null} */
let currentSession = null;
/** @type {string|null} */
let baseUrl = null;

/**
 * Create a new chat session
 * @param {string} serverBaseUrl - Base URL of the opencode server
 * @param {Object} selectedProject - Currently selected project
 * @returns {Promise<import('../../../../shared/types/opencode.types.js').Session>} - Session object
 */
export const createSession = async (serverBaseUrl, selectedProject = null) => {
  try {


    const response = await fetch(`${serverBaseUrl}/session`, {
      method: 'POST',
      headers: getRequestHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }, selectedProject)
    });

    if (!response.ok) {
      throw new Error(`Session creation failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
    }

    /** @type {import('../../../../shared/types/opencode.types.js').Session} */
    const session = await response.json();


    if (!session.id) {
      throw new Error('Invalid session response: missing session id');
    }

    currentSession = session;
    baseUrl = serverBaseUrl;


    return session;
  } catch (error) {
    console.error('❌ Session creation failed:', error);
    throw error;
  }
};

/**
 * Get the current active session
 * @returns {import('../../../../shared/types/opencode.types.js').Session|null} - Current session or null if no session
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
 * @param {import('../../../../shared/types/opencode.types.js').Session} session - Session to set as current
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
 * @returns {Promise<import('../../../../shared/types/opencode.types.js').SessionMessageResponse>} - Server response
 */
export const sendMessageToSession = async (messageText, mode = 'build', selectedProject = null, selectedModel = null) => {
  if (!currentSession || !baseUrl) {
    throw new Error('No active session. Please connect first.');
  }

  const messageUrl = `${baseUrl}/session/${currentSession.id}/message`;

  /** @type {import('../../../../shared/types/opencode.types.js').SessionMessageRequest} */
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

   console.log('📤 Sending message, raw messageBody:', JSON.stringify(messageBody, null, 2));



  try {
    const response = await fetch(messageUrl, {
      method: 'POST',
      headers: getRequestHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }, selectedProject),
      body: JSON.stringify(messageBody)
    });

    if (!response.ok) {
      throw new Error(`Message send failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
    }

    /** @type {import('../../../../shared/types/opencode.types.js').SessionMessageResponse} */
    const data = await response.json();
    console.log('✅ Message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Message send failed:', error);
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
    const response = await fetch(`${serverBaseUrl}/session/${sessionId}`, {
      method: 'DELETE',
      headers: getRequestHeaders({
        'Accept': 'application/json'
      }, selectedProject)
    });

    if (!response.ok) {
      throw new Error(`Session deletion failed: ${response.status} ${response.statusText}`);
    }

    // If we deleted the current session, clear it
    if (currentSession && currentSession.id === sessionId) {
      currentSession = null;
    }

    console.log('✅ Session deleted successfully:', sessionId);
    return true;
  } catch (error) {
    console.error('❌ Session deletion failed:', error);
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