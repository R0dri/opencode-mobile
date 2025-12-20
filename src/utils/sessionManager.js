/**
 * Session management utility for opencode chat sessions
 * Handles session creation, storage, and retrieval
 */

import './opencode-types.js';

// In-memory session storage (can be expanded to persistent storage later)
/** @type {import('./opencode-types.js').Session|null} */
let currentSession = null;
/** @type {string|null} */
let baseUrl = null;

/**
 * Create a new chat session
 * @param {string} serverBaseUrl - Base URL of the opencode server
 * @returns {Promise<import('./opencode-types.js').Session>} - Session object
 */
export const createSession = async (serverBaseUrl) => {
  try {


    const response = await fetch(`${serverBaseUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Session creation failed: ${response.status} ${response.statusText}`);
    }

    /** @type {import('./opencode-types.js').Session} */
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
 * @returns {import('./opencode-types.js').Session|null} - Current session or null if no session
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
 * @param {import('./opencode-types.js').Session} session - Session to set as current
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
 * @returns {Promise<import('./opencode-types.js').SessionMessageResponse>} - Server response
 */
export const sendMessageToSession = async (messageText) => {
  if (!currentSession || !baseUrl) {
    throw new Error('No active session. Please connect first.');
  }

  const messageUrl = `${baseUrl}/session/${currentSession.id}/message`;

  /** @type {import('./opencode-types.js').SessionMessageRequest} */
  const messageBody = {
    parts: [{ type: 'text', text: messageText }]
  };



  try {
    const response = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(messageBody)
    });

    if (!response.ok) {
      throw new Error(`Message send failed: ${response.status} ${response.statusText}`);
    }

    /** @type {import('./opencode-types.js').SessionMessageResponse} */
    const data = await response.json();
    console.log('✅ Message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Message send failed:', error);
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