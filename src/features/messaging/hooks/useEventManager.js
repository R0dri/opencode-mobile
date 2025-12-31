// Event management for SSE messages
import { useEffect } from 'react';
import { sseService } from '../../../services/sse/sse.service';

export const useEventManager = (onMessage, selectedSession) => {
  useEffect(() => {
    if (!selectedSession) return;

    // Set up message handler
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messages = Array.isArray(data) ? data : [data];

        messages.forEach(message => {
          const payloadType = message.payload?.type;

          // Allow message.updated events to bypass session filtering
          if (payloadType === 'message.updated') {
            onMessage(message);
            return;
          }

          // Only process messages for current session
          const sessionId = message.session_id || message.sessionId ||
                            message.info?.sessionID || // For incoming SSE messages
                            message.payload?.properties?.sessionID ||
                            message.payload?.properties?.info?.sessionID ||
                            message.payload?.properties?.part?.sessionID;

          if (sessionId === selectedSession.id) {
            onMessage(message);
          }
        });
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    // Add event listener
    sseService.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      sseService.removeEventListener('message', handleMessage);
    };
  }, [onMessage, selectedSession]);

  return {
    isConnected: sseService.getStatus(),
    readyState: sseService.getReadyState()
  };
};