/**
 * Server types and interfaces for the servers feature
 */

/**
 * Server connection status
 * @enum {string}
 */
export const ServerStatusEnum = {
  /** Server is currently connected */
  CONNECTED: 'connected',
  /** Server connection is in progress */
  CONNECTING: 'connecting',
  /** Server was previously connected but is now disconnected */
  DISCONNECTED: 'disconnected',
  /** Server is unreachable or connection failed */
  ERROR: 'error',
};

/**
 * Server object type definition
 * @typedef {Object} Server
 * @property {string} id - Unique identifier for the server
 * @property {string} name - Display name for the server
 * @property {string} url - Server URL (without /global/event)
 * @property {string} [lastConnected] - ISO date string of last successful connection
 * @property {string} [status] - Current connection status (ServerStatusEnum values)
 * @property {boolean} isPinned - Whether server is pinned to top of list
 * @property {number} [connectionCount] - Number of times connected to this server
 */

/**
 * Server list item props
 * @typedef {Object} ServerListItemProps
 * @property {Server} server - Server object to display
 * @property {boolean} isSelected - Whether this server is currently selected
 * @property {Function} onPress - Function called when server is pressed
 * @property {Function} onDelete - Function called when delete button is pressed
 */

/**
 * Server connection modal props
 * @typedef {Object} ServerConnectionModalProps
 * @property {boolean} visible - Whether modal is visible
 * @property {Function} onClose - Function called to close modal
 * @property {Array<Server>} servers - List of saved servers
 * @property {string} inputUrl - Current URL input value
 * @property {Function} setInputUrl - Function to update URL input
 * @property {Function} onConnect - Function called to connect to server
 * @property {boolean} isConnecting - Whether connection is in progress
 * @property {boolean} isConnected - Whether already connected
 * @property {Function} [onServerSelect] - Function called when server from list is selected
 */

/**
 * Camera scanner props
 * @typedef {Object} CameraScannerProps
 * @property {Function} onScan - Function called when QR code is scanned
 * @property {Function} onClose - Function called to close scanner
 */

// Export empty object to make this a valid module
export {};
