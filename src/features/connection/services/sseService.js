// SSE (Server-Sent Events) service wrapper with advanced reconnection logic
import EventSource from 'react-native-sse';
import { logger } from '@/shared/services/logger';
import { ConnectionStateEnum, ConnectionErrorTypeEnum } from '../types/connection.types';

const sseLogger = logger.tag('SSE');

/**
 * SSE service for real-time connections with advanced reconnection handling
 */
export class SSEService {
  constructor() {
    this.eventSource = null;
    this.state = ConnectionStateEnum.DISCONNECTED;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.heartbeatCallback = null;
    this.onStateChange = null;
    this.onError = null;
    this.onHeartbeatMissed = null;

    // Reconnection configuration
    this.retryCount = 0;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 5; // Hard limit to prevent doom loops
    this.retryCooldown = 5000; // 5 second cooldown after consecutive failures
    this.lastFailureTime = null;
    this.maxRetries = 10;
    this.initialDelayMs = 1000;
    this.maxDelayMs = 60000;
    this.backoffMultiplier = 2;
    this.jitterFactor = 0.3;
    this.silentMode = true;

    // Heartbeat configuration
    this.heartbeatEnabled = true;
    this.heartbeatIntervalMs = 30000;
    this.heartbeatTimeoutMs = 1800000; // 30 minutes - allows long-running SSE connections through tunnels
    this.lastHeartbeatTime = null;
    this.heartbeatAckReceived = false;

    // Current connection URL
    this.currentUrl = null;
    this.currentOptions = {};

    // Initialization flag to prevent duplicate logging
    this._initialized = false;

    // Perform one-time initialization
    this._initialize();
  }

  /**
   * One-time initialization for SSE service
   * Configures reconnection and heartbeat settings once
   */
  _initialize() {
    if (this._initialized) return;

    // Set default configuration without logging (avoid startup spam)
    this.maxRetries = 10;
    this.initialDelayMs = 1000;
    this.maxDelayMs = 60000;
    this.backoffMultiplier = 2;
    this.jitterFactor = 0.3;
    this.silentMode = true;

    // Heartbeat configuration
    this.heartbeatEnabled = true;
    this.heartbeatIntervalMs = 30000;
    this.heartbeatTimeoutMs = 1800000;

    this._initialized = true;
  }

  /**
   * Configure reconnection behavior
   * @param {Object} config - Reconnection configuration
   */
  configureReconnect(config = {}) {
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
    if (config.initialDelayMs !== undefined) this.initialDelayMs = config.initialDelayMs;
    if (config.maxDelayMs !== undefined) this.maxDelayMs = config.maxDelayMs;
    if (config.backoffMultiplier !== undefined) this.backoffMultiplier = config.backoffMultiplier;
    if (config.jitterFactor !== undefined) this.jitterFactor = config.jitterFactor;
    if (config.silentMode !== undefined) this.silentMode = config.silentMode;
  }

  /**
   * Configure heartbeat behavior
   * @param {Object} config - Heartbeat configuration
   */
  configureHeartbeat(config = {}) {
    if (config.enabled !== undefined) this.heartbeatEnabled = config.enabled;
    if (config.intervalMs !== undefined) this.heartbeatIntervalMs = config.intervalMs;
    if (config.timeoutMs !== undefined) this.heartbeatTimeoutMs = config.timeoutMs;
  }

  /**
   * Set callbacks for state changes and errors
   * @param {Object} callbacks - Callbacks object
   */
  setCallbacks(callbacks = {}) {
    this.onStateChange = callbacks.onStateChange ?? null;
    this.onError = callbacks.onError ?? null;
    this.onHeartbeatMissed = callbacks.onHeartbeatMissed ?? null;
  }

  /**
   * Update connection state and notify callback
   * @param {string} newState - New connection state
   */
  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      sseLogger.debug('Connection state changed', { oldState, newState });
      if (this.onStateChange) {
        try {
          this.onStateChange(newState, oldState);
        } catch (error) {
          sseLogger.error('State change callback error', error);
        }
      }
    }
  }

  /**
   * Get current connection state
   * @returns {string} Current state
   */
  getState() {
    return this.state ?? ConnectionStateEnum.DISCONNECTED;
  }

  /**
   * Check if connected
   * @returns {boolean} Whether connected
   */
  isConnected() {
    return this.state === ConnectionStateEnum.CONNECTED;
  }

  /**
   * Check if connecting
   * @returns {boolean} Whether connecting
   */
  isConnecting() {
    return this.state === ConnectionStateEnum.CONNECTING;
  }

  /**
   * Check if reconnecting
   * @returns {boolean} Whether reconnecting
   */
  isReconnecting() {
    return this.state === ConnectionStateEnum.RECONNECTING;
  }

  /**
   * Check if failed
   * @returns {boolean} Whether failed
   */
  isFailed() {
    return this.state === ConnectionStateEnum.FAILED;
  }

  /**
   * Classify error type from event
   * @param {Object} event - Error event
   * @returns {string} Error type
   */
  classifyError(event) {
    const message = event?.message || '';
    const status = event?.status || 0;

    // Cloudflare tunnel stream cancel - treat as network issue but recoverable
    if (message.includes('stream canceled') || message.includes('canceled by remote')) {
      sseLogger.debug('Cloudflare stream cancel detected, will retry');
      return ConnectionErrorTypeEnum.NETWORK_UNREACHABLE;
    }

    if (message.includes('Network request timed out') || message.includes('timeout')) {
      return ConnectionErrorTypeEnum.TIMEOUT;
    }
    if (status === 0 || message.includes('Network') || message.includes('network')) {
      return ConnectionErrorTypeEnum.NETWORK_UNREACHABLE;
    }
    if (status === 401 || status === 403) {
      return ConnectionErrorTypeEnum.AUTH_ERROR;
    }
    if (status >= 400) {
      return ConnectionErrorTypeEnum.SERVER_ERROR;
    }
    return ConnectionErrorTypeEnum.UNKNOWN;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current retry attempt
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    const baseDelay = Math.min(
      this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt),
      this.maxDelayMs,
    );
    const jitter = baseDelay * this.jitterFactor * Math.random();
    return Math.floor(baseDelay + jitter);
  }

  /**
   * Check server health before connecting
   * @param {string} baseUrl - Base server URL (without /global/event)
   * @returns {Promise<{healthy: boolean, version?: string}>}
   */
  async checkHealth(baseUrl) {
    try {
      // Ensure baseUrl doesn't have trailing slash and doesn't have /global/event
      const cleanBaseUrl = baseUrl.replace(/\/global\/event\/?$/, '').replace(/\/$/, '');
      const healthUrl = `${cleanBaseUrl}/global/health`;
      sseLogger.debug('Checking server health', { url: healthUrl, originalBaseUrl: baseUrl });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      sseLogger.debug('Health check response', { status: response.status, ok: response.ok });

      if (!response.ok) {
        sseLogger.warn('Health check failed', { status: response.status, url: healthUrl });
        return { healthy: false };
      }

      const data = await response.json();

      if (data && data.healthy === true) {
        sseLogger.debug('Health check passed', { version: data.version, url: healthUrl });
        return { healthy: true, version: data.version };
      }

      sseLogger.warn('Server returned unhealthy status', { data, url: healthUrl });
      return { healthy: false };
    } catch (error) {
      sseLogger.debug('Health check error', { error: error.message, name: error.name, baseUrl });
      // Handle AbortError (timeout) gracefully
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        sseLogger.warn('Health check timed out', { baseUrl });
        return { healthy: false };
      }
      return { healthy: false };
    }
  }

  /**
   * Connect to SSE endpoint
   * @param {string} url - SSE endpoint URL
   * @param {Object} options - Connection options
   * @param {Function} options.heartbeatCallback - Callback to run on heartbeat
   * @param {boolean} options.isReconnect - Whether this is a reconnection attempt
   * @param {boolean} options.skipHealthCheck - Skip health check before connecting
   * @returns {EventSource} - EventSource instance
   */
  async connect(url, options = {}) {
    const { heartbeatCallback = null, isReconnect = false, skipHealthCheck = false } = options;

    // Perform health check unless skipped
    if (!skipHealthCheck) {
      const baseUrl = url.replace('/global/event', '');
      sseLogger.debug('Performing health check', { originalUrl: url, cleanBaseUrl: baseUrl });
      const health = await this.checkHealth(baseUrl);

      if (!health.healthy) {
        sseLogger.warn('Skipping SSE connection - server unhealthy', { baseUrl });
        this.setState(ConnectionStateEnum.FAILED);
        if (this.onError) {
          this.onError({
            message: 'Server health check failed',
            type: ConnectionErrorTypeEnum.SERVER_ERROR,
            retryCount: 0,
            maxRetries: this.maxRetries,
          });
        }
        return null;
      }
      sseLogger.debug('Health check passed, proceeding with SSE connection');
    }

    this.disconnect();

    this.currentUrl = url;
    this.currentOptions = options;

    sseLogger.debug(isReconnect ? 'Reconnecting to SSE endpoint' : 'Connecting to SSE endpoint', {
      url,
    });

    this.setState(isReconnect ? ConnectionStateEnum.RECONNECTING : ConnectionStateEnum.CONNECTING);
    this.heartbeatCallback = options.heartbeatCallback || null;

    this.eventSource = new EventSource(url, {
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...options.headers,
      },
      lineEndingCharacter: '\n',
    });

    this.eventSource.addEventListener('open', () => {
      sseLogger.debug('SSE connection opened', { url, isReconnect });
      this.isConnected = true;
      this.retryCount = 0;
      this.consecutiveFailures = 0; // Reset consecutive failures on success
      this.lastFailureTime = null;
      this.setState(ConnectionStateEnum.CONNECTED);
      this.startHeartbeat();
    });

    this.eventSource.addEventListener('error', event => {
      const errorType = this.classifyError(event);
      sseLogger.warn('SSE connection lost, reconnecting...', {
        url,
        errorType,
        isReconnect,
        consecutiveFailures: this.consecutiveFailures,
      });

      this.isConnected = false;
      this.stopHeartbeat();
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();

      // Check for doom loop: too many consecutive failures in short time
      const now = Date.now();
      const isInCooldown = this.lastFailureTime && now - this.lastFailureTime < this.retryCooldown;

      if (this.consecutiveFailures >= this.maxConsecutiveFailures && isInCooldown) {
        sseLogger.error('Doom loop detected - entering cooldown', {
          consecutiveFailures: this.consecutiveFailures,
          cooldownMs: this.retryCooldown,
        });
        this.setState(ConnectionStateEnum.FAILED);

        // Schedule single retry after cooldown instead of rapid retries
        this.retryCount = 0;
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.consecutiveFailures = 0; // Reset after cooldown
          sseLogger.debug('Cooldown complete, retrying connection');
          this.connect(url, { ...options, isReconnect: true });
        }, this.retryCooldown);

        return;
      }

      if (this.retryCount >= this.maxRetries) {
        // Max retries exhausted, transition to failed state
        sseLogger.error('Max reconnection attempts exhausted', {
          url,
          retryCount: this.retryCount,
          maxRetries: this.maxRetries,
        });
        this.setState(ConnectionStateEnum.FAILED);

        // Only notify via callback if not in silent mode
        if (!this.silentMode && this.onError) {
          try {
            this.onError({
              message: event?.message || 'Connection failed after max retries',
              type: errorType,
              retryCount: this.retryCount,
              maxRetries: this.maxRetries,
            });
          } catch (error) {
            sseLogger.error('Error callback error', error);
          }
        }
      } else {
        // Schedule retry
        this.retryCount++;
        this.scheduleReconnect(url, options, this.retryCount);
      }
    });

    return this.eventSource;
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      sseLogger.debug('Disconnecting from SSE', { url: this.currentUrl });
      try {
        this.eventSource.close();
      } catch (error) {
        sseLogger.warn('Error closing EventSource', error);
      }
      this.eventSource = null;
    }

    this.isConnected = false;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.setState(ConnectionStateEnum.DISCONNECTED);
    this.retryCount = 0;
    this.consecutiveFailures = 0; // Reset on disconnect
    this.lastFailureTime = null;
  }

  /**
   * Force immediate reconnection
   */
  reconnect() {
    sseLogger.debug('Force reconnect requested');
    this.retryCount = 0;
    this.consecutiveFailures = 0; // Reset on manual reconnect
    this.lastFailureTime = null;
    if (this.currentUrl) {
      this.connect(this.currentUrl, { ...this.currentOptions, isReconnect: true });
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   */
  addEventListener(event, callback) {
    if (this.eventSource) {
      this.eventSource.addEventListener(event, callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   */
  removeEventListener(event, callback) {
    if (this.eventSource) {
      this.eventSource.removeEventListener(event, callback);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    if (!this.heartbeatEnabled) {
      sseLogger.debug('Heartbeat disabled, skipping start');
      return;
    }

    this.stopHeartbeat();
    this.lastHeartbeatTime = null;
    this.heartbeatAckReceived = true;

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  /**
   * Send heartbeat and expect acknowledgment
   */
  sendHeartbeat() {
    // Safety check - if service was reset, don't send heartbeat
    if (!this || !this.eventSource) {
      sseLogger.warn('Cannot send heartbeat, service or EventSource not available');
      return;
    }

    this.lastHeartbeatTime = Date.now();
    this.heartbeatAckReceived = false;

    sseLogger.debug('Sending heartbeat');

    // Set timeout for acknowledgment
    this.heartbeatTimeout = setTimeout(() => {
      // Safety check for this context
      if (!this || this.heartbeatAckReceived) return;

      if (this.state === ConnectionStateEnum.CONNECTED) {
        sseLogger.warn('Heartbeat acknowledgment not received, reconnecting...');
        this.stopHeartbeat();
        this.scheduleReconnect(this.currentUrl, this.currentOptions, this.retryCount + 1);

        if (this.onHeartbeatMissed) {
          try {
            this.onHeartbeatMissed();
          } catch (error) {
            sseLogger.error('Heartbeat missed callback error', error);
          }
        }
      }
    }, this.heartbeatTimeoutMs);

    // Run heartbeat callback if configured
    if (this.heartbeatCallback) {
      try {
        this.heartbeatCallback();
        this.heartbeatAckReceived = true;
        clearTimeout(this.heartbeatTimeout);
      } catch (error) {
        sseLogger.error('Heartbeat callback error', error);
        // Still mark as received if callback ran (even with error)
        this.heartbeatAckReceived = true;
        clearTimeout(this.heartbeatTimeout);
      }
    }
  }

  /**
   * Acknowledge heartbeat receipt (called by external code)
   */
  acknowledgeHeartbeat() {
    this.heartbeatAckReceived = true;
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   * @param {string} url - SSE URL
   * @param {Object} options - Connection options
   * @param {number} attempt - Current attempt number
   */
  scheduleReconnect(url, options, attempt = 1) {
    if (this.reconnectTimeout) {
      sseLogger.debug('Reconnect already scheduled, skipping');
      return;
    }

    const delay = this.calculateDelay(attempt);
    sseLogger.debug(`Scheduling reconnect attempt ${attempt}/${this.maxRetries} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(url, { ...options, isReconnect: true });
    }, delay);
  }

  /**
   * Get connection status
   * @returns {Object} Connection status info
   */
  getStatus() {
    return {
      state: this.state,
      isConnected: this.state === ConnectionStateEnum.CONNECTED,
      isConnecting: this.state === ConnectionStateEnum.CONNECTING,
      isReconnecting: this.state === ConnectionStateEnum.RECONNECTING,
      isFailed: this.state === ConnectionStateEnum.FAILED,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    };
  }

  /**
   * Get ready state
   * @returns {number} Ready state
   */
  getReadyState() {
    return this.eventSource ? this.eventSource.readyState : EventSource.CLOSED;
  }

  /**
   * Clear error and reset retry count (for manual retry)
   */
  clearError() {
    if (this.state === ConnectionStateEnum.FAILED) {
      sseLogger.debug('Clearing failed state for manual retry');
      this.retryCount = 0;
      this.setState(ConnectionStateEnum.DISCONNECTED);
    }
  }
}

// Export singleton instance
export const sseService = new SSEService();
