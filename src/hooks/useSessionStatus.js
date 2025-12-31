import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing session status and thinking animation
 * @param {Object} selectedSession - Currently selected session
 * @returns {Object} - Session status state and handlers
 */
export const useSessionStatus = (selectedSession) => {
  const [isThinking, setIsThinking] = useState(false);

  // Reset thinking when session changes
  useEffect(() => {

    setIsThinking(false);
  }, [selectedSession?.id]);

  // Debug: Log thinking state changes
  useEffect(() => {

  }, [isThinking]);

  // Handle session status message
  const handleSessionStatus = (message) => {
    if (message.payload?.type !== 'session.status') {
      return false; // Not a session status message
    }

    const statusType = message.payload.properties.status?.type;
    const messageSessionId = message.payload.properties.sessionID;
    const selectedSessionId = selectedSession?.id;

    // Only handle status for currently selected session
    if (messageSessionId !== selectedSessionId) {
      return false; // Not for current session
    }

    // Update thinking state based on status
    if (statusType === 'busy') {
      setIsThinking(true);
    } else if (statusType === 'idle') {
      setIsThinking(false);
    }
  };

  // Manual reset function
  const resetThinking = useCallback(() => {
    setIsThinking(false);
  }, []);

  return {
    isThinking,
    handleSessionStatus,
    resetThinking
  };
};