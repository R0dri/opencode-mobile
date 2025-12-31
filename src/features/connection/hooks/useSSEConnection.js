// Pure SSE connection management
import { useState, useRef, useEffect } from 'react';
import { sseService } from '../../../services/sse/sse.service';

export const useSSEConnection = (baseUrl, heartbeatCallback = null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

   const connect = async () => {
     if (!baseUrl) return;

     setIsConnecting(true);
     setError(null);

     try {
       const sseUrl = `${baseUrl}/global/event`;
       eventSourceRef.current = sseService.connect(sseUrl, { heartbeatCallback });
       setIsConnected(true);
     } catch (err) {
       setError(err.message);
       setIsConnected(false);
     } finally {
       setIsConnecting(false);
     }
   };

  const disconnect = () => {
    sseService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    eventSourceRef.current = null;
  };

  // Auto-connect when baseUrl changes
  useEffect(() => {
    console.log('useSSEConnection: baseUrl changed to', baseUrl);
    if (baseUrl && !isConnected && !isConnecting) {
      console.log('useSSEConnection: calling connect');
      connect();
    }
    return () => disconnect();
  }, [baseUrl]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect
  };
};