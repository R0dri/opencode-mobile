/**
 * SSE Message Pre-processor
 * Handles real-time Server-Sent Events messages
 *
 * Expected input structure:
 * {
 *   payload: {
 *     type: "message.updated" | "message.part.updated" | "session.error" | etc,
 *     properties: {
 *       info: { role, id, sessionID, mode, agent },
 *       summary: { body: "..." },
 *       part: { text, type, messageID, id },
 *       delta: "...",
 *       error: { message, data, name }
 *     }
 *   },
 *   session_id: "...",
 *   info: { ... }
 * }
 */
import { logger } from '@/shared/services/logger';

const sseLogger = logger.tag('SSEPreprocessor');

/**
 * Pre-processes a single SSE message
 * @param {Object} rawMessage - Raw SSE message
 * @param {Object} options - Processing options
 * @returns {Object} - Pre-processed message
 */
export const preprocessSSEMessage = (rawMessage, options = {}) => {
  const { includeRaw = false, sessionId = null, projectName = null } = options;

  if (!rawMessage || typeof rawMessage !== 'object') {
    sseLogger.warn('Invalid SSE message received');
    return createInvalidMessage('Invalid SSE message');
  }

  const payload = rawMessage.payload;
  if (!payload || typeof payload !== 'object') {
    sseLogger.warn('SSE message missing payload');
    return createInvalidMessage('Missing payload');
  }

  const payloadType = payload.type || 'unknown';
  const properties = payload.properties || {};

  // Extract session ID from multiple possible locations
  const extractedSessionId =
    rawMessage.session_id ||
    rawMessage.sessionId ||
    properties.sessionID ||
    properties.info?.sessionID ||
    properties.part?.sessionID ||
    sessionId;

  // Extract role - MUST use info.role for proper classification
  // Also infer role from payload type for user messages (live feed)
  let extractedRole = properties.info?.role || null;

  // Infer role from payload type (user/system cases only for live feed)
  if (!extractedRole) {
    const msgType = payloadType?.toLowerCase();
    if (msgType === 'user' || msgType === 'sent' || msgType === 'message.created') {
      extractedRole = 'user';
    } else if (msgType === 'system' || msgType === 'system_message') {
      extractedRole = 'system';
    }
  }

  // Pre-processed message structure
  const processed = {
    // Source identification
    source: 'sse',
    messageId: properties.info?.id || properties.part?.messageID || generateId(),
    sessionId: extractedSessionId,
    payloadType,
    timestamp: Date.now(),

    role: extractedRole,
    type: mapPayloadTypeToType(payloadType, properties.part?.type),
    agent: properties.info?.agent || null,
    mode: properties.info?.mode || 'build',

    // Text content (varies by type)
    text: extractSSEText(rawMessage, payload, properties),
    reasoning: properties.part?.type === 'reasoning' ? properties.part.text : null,

    // Error handling
    error: payloadType === 'session.error' ? extractError(properties) : null,

    // Partial message tracking
    isPartial: payloadType === 'message.part.updated',
    partId: properties.part?.id || null,
    partType: properties.part?.type || null,
    delta: properties.delta || null,

    // Project context
    projectName: projectName || rawMessage.projectName || null,

    // Raw data for debugging
    ...(includeRaw && { rawData: rawMessage }),
  };

  sseLogger.debug('SSE message pre-processed', {
    type: payloadType,
    hasText: !!processed.text,
    isPartial: processed.isPartial,
  });

  return processed;
};

/**
 * Batch pre-process SSE messages
 * @param {Array} messages - Array of SSE messages
 * @param {Object} options - Processing options
 * @returns {Array} - Array of pre-processed messages
 */
export const preprocessSSEMessages = (messages, options = {}) => {
  if (!Array.isArray(messages)) {
    sseLogger.warn('preprocessSSEMessages received non-array');
    return [];
  }

  return messages.map(msg => preprocessSSEMessage(msg, options));
};

/**
 * Extracts text content from SSE message
 */
const extractSSEText = (rawMessage, payload, properties) => {
  const info = properties.info || {};

  // Priority 1: summary.body (finalized messages)
  if (info.summary?.body) {
    return info.summary.body;
  }

  // Priority 2: part text (partial messages)
  if (properties.part?.text) {
    return properties.part.text;
  }

  // Priority 3: info.message (simple messages)
  if (info.message) {
    return info.message;
  }

  // Priority 4: message field at root
  if (rawMessage.message) {
    return rawMessage.message;
  }

  return null;
};

/**
 * Extracts error information from SSE message
 */
const extractError = properties => {
  const error = properties.error || {};
  return {
    name: error.name || 'Error',
    message: error.data?.message || error.message || 'Unknown error',
    statusCode: error.data?.statusCode || null,
    data: error.data || null,
  };
};

/**
 * Creates an invalid message placeholder
 */
const createInvalidMessage = reason => ({
  source: 'sse',
  type: 'invalid',
  error: true,
  text: null,
  messageId: generateId(),
  timestamp: Date.now(),
});

/**
 * Maps SSE payload types to display type
 */
const mapPayloadTypeToType = (payloadType, partType) => {
  // Error handling
  if (payloadType === 'session.error' || payloadType === 'agent.error') {
    return 'error';
  }

  // System messages (no display)
  if (
    payloadType === 'session.status' ||
    payloadType === 'session.idle' ||
    payloadType === 'system-reminder'
  ) {
    return 'system';
  }

  // Partial/streaming - check part type
  if (payloadType === 'message.part.updated') {
    return partType === 'reasoning' ? 'reasoning' : 'text';
  }

  // Finalized messages
  if (payloadType === 'message.updated' || payloadType === 'message.loaded') {
    return 'text';
  }

  // Todo updates
  if (payloadType === 'todo.update') {
    return 'system';
  }

  return 'text'; // Default
};
