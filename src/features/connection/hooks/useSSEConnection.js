// Enhanced SSE connection management with state machine
import { useState, useCallback, useEffect, useRef } from 'react';
import { sseService } from '../services/sseService';
import { ConnectionStateEnum, ConnectionErrorTypeEnum } from '../types/connection.types';
import { logger } from '@/shared/services/logger';

const sseLogger = logger.tag('SSE');

/**
 * Enhanced SSE connection hook with proper state machine and callbacks
 * @param {string} baseUrl - Base URL for SSE endpoint
 * @param {Object} options - Connection options
 * @param {Function} options.heartbeatCallback - Callback to run on heartbeat
 * @param {Function} options.onStateChange - Callback when connection state changes
 * @param {Function} options.onError - Callback when error occurs
 * @param {Function} options.onHeartbeatMissed - Callback when heartbeat is missed
 * @param {Object} options.reconnectConfig - Reconnection configuration
 * @param {Object} options.heartbeatConfig - Heartbeat configuration
 * @returns {Object} Connection state and actions
 */
export const useSSEConnection = (baseUrl, options = {}) => {
  const {
    heartbeatCallback = null,
    onStateChange = null,
    onError = null,
    onHeartbeatMissed = null,
  } = options;

  const [state, setState] = useState(ConnectionStateEnum.DISCONNECTED);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries, setMaxRetries] = useState(10);
  const eventSourceRef = useRef(null);

  // Track connection attempt to prevent doom loops
  const connectionAttemptRef = useRef(false);

  // Keep callbacks in refs to avoid stale closures while preventing effect re-runs
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);
  const onHeartbeatMissedRef = useRef(onHeartbeatMissed);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    onErrorRef.current = onError;
    onHeartbeatMissedRef.current = onHeartbeatMissed;
  });

  // Set callbacks once on mount
  useEffect(() => {
    sseService.setCallbacks({
      onStateChange: (newState, oldState) => {
        setState(newState);
        sseLogger.debug('Connection state changed in hook', { oldState, newState });
        if (onStateChangeRef.current) {
          try {
            onStateChangeRef.current(newState, oldState);
          } catch (err) {
            sseLogger.error('State change callback error', err);
          }
        }
      },
      onError: errorInfo => {
        const errorMessage = errorInfo?.message || 'Connection failed';
        setError(errorMessage);
        setErrorType(errorInfo?.type || ConnectionErrorTypeEnum.UNKNOWN);
        setRetryCount(errorInfo?.retryCount || 0);
        setMaxRetries(errorInfo?.maxRetries || 10);
        sseLogger.warn('Connection error', errorInfo);
        if (onErrorRef.current) {
          try {
            onErrorRef.current(errorInfo);
          } catch (err) {
            sseLogger.warn('Error callback error', err);
          }
        }
      },
      onHeartbeatMissed: () => {
        sseLogger.warn('Heartbeat missed in hook');
        if (onHeartbeatMissedRef.current) {
          try {
            onHeartbeatMissedRef.current();
          } catch (err) {
            sseLogger.error('Heartbeat missed callback error', err);
          }
        }
      },
    });
  }, []);

  const connect = useCallback(
    async (urlOrOptions, options = {}) => {
      // Support both connect(url), connect({ url, skipHealthCheck }), connect({ url, skipHealthCheck, autoSelect })
      let url = typeof urlOrOptions === 'string' ? urlOrOptions : null;
      let skipHealthCheck = false;

      if (typeof urlOrOptions === 'object') {
        url = urlOrOptions.url;
        skipHealthCheck = urlOrOptions.skipHealthCheck ?? false;
        // autoSelect is handled by orchestrator, ignore here
      }

      // Use baseUrl if no URL provided
      if (!url) {
        url = baseUrl;
      }

      if (!url) {
        sseLogger.warn('Cannot connect: no baseUrl provided');
        return;
      }

      // Prevent doom loop: skip if already attempting to connect
      if (connectionAttemptRef.current) {
        sseLogger.debug('Skipping connect - connection attempt already in progress');
        return;
      }

      // Skip if already connected to avoid duplicate EventSources
      if (sseService.isConnected()) {
        sseLogger.debug('Skipping connect - already connected');
        return;
      }

      const sseUrl = `${url}/global/event`;
      sseLogger.debug('Connecting to SSE', { url: sseUrl, skipHealthCheck });

      // Mark connection attempt
      connectionAttemptRef.current = true;

      try {
        eventSourceRef.current = sseService.connect(sseUrl, { heartbeatCallback, skipHealthCheck });
      } finally {
        // Always clear the attempt flag, even on failure
        connectionAttemptRef.current = false;
      }
    },
    [baseUrl, heartbeatCallback],
  );

  const disconnect = useCallback(() => {
    sseLogger.debug('Disconnect requested');
    sseService.disconnect();
    setError(null);
    setErrorType(null);
    setRetryCount(0);
    eventSourceRef.current = null;
    connectionAttemptRef.current = false; // Reset connection attempt flag
  }, []);

  const reconnect = useCallback(() => {
    sseLogger.debug('Reconnect requested');
    sseService.reconnect();
  }, []);

  const clearError = useCallback(() => {
    sseLogger.debug('Clear error requested');
    sseService.clearError();
    setError(null);
    setErrorType(null);
    setRetryCount(0);
  }, []);

  const acknowledgeHeartbeat = useCallback(() => {
    sseService.acknowledgeHeartbeat();
  }, []);

  return {
    // Connection state
    state,
    isConnected: state === ConnectionStateEnum.CONNECTED,
    isConnecting: state === ConnectionStateEnum.CONNECTING,
    isReconnecting: state === ConnectionStateEnum.RECONNECTING,
    isFailed: state === ConnectionStateEnum.FAILED,
    isDisconnected: state === ConnectionStateEnum.DISCONNECTED,

    // Error info
    error,
    errorType,
    retryCount,
    maxRetries,

    // Actions
    connect,
    disconnect,
    reconnect,
    clearError,
    acknowledgeHeartbeat,
  };
};
