// SSE (Server-Sent Events) service wrapper
import EventSource from 'react-native-sse';

/**
 * SSE service for real-time connections
 */
export class SSEService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.heartbeatCallback = null;
  }

  /**
   * Connect to SSE endpoint
    * @param {string} url - SSE endpoint URL
    * @param {Object} options - Connection options
    * @param {Function} options.heartbeatCallback - Callback to run on heartbeat
    * @returns {EventSource} - EventSource instance
    */
   connect(url, options = {}) {
     // Close existing connection
     this.disconnect();

     console.log('SSE: Connecting to', url);

     // Store heartbeat callback
     this.heartbeatCallback = options.heartbeatCallback || null;

     this.eventSource = new EventSource(url, {
       headers: {
         'Accept': 'text/event-stream',
         'Cache-Control': 'no-cache',
         ...options.headers
       }
     });

    this.eventSource.addEventListener('open', () => {
      console.log('SSE: Connection opened');
      this.isConnected = true;
      this.startHeartbeat();
    });



    this.eventSource.addEventListener('error', (event) => {
      console.log('SSE: Connection error', event);
      this.isConnected = false;
      this.scheduleReconnect(url, options);
    });

    return this.eventSource;
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      console.log('SSE: Disconnecting');
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnected = false;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
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
     this.stopHeartbeat();
     this.heartbeatInterval = setInterval(() => {
       if (this.eventSource && this.eventSource.readyState !== EventSource.OPEN) {
         console.log('SSE: Heartbeat failed, reconnecting...');
         this.isConnected = false;
         // The error handler will trigger reconnection
       } else {
         console.log('SSE: Heartbeat OK');
         // Call heartbeat callback if provided
         if (this.heartbeatCallback) {
           try {
             this.heartbeatCallback();
           } catch (error) {
             console.error('SSE: Heartbeat callback error:', error);
           }
         }
       }
     }, 30000); // Check every 30 seconds
   }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection
   * @param {string} url - SSE URL
   * @param {Object} options - Connection options
   */
  scheduleReconnect(url, options) {
    if (this.reconnectTimeout) return;

    console.log('SSE: Scheduling reconnect in 5 seconds');
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(url, options);
    }, 5000);
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  getStatus() {
    return this.isConnected;
  }

  /**
   * Get ready state
   * @returns {number} - Ready state
   */
  getReadyState() {
    return this.eventSource ? this.eventSource.readyState : EventSource.CLOSED;
  }
}

// Export singleton instance
export const sseService = new SSEService();