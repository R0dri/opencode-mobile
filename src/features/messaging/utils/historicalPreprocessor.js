/**
 * Historical Messages Pre-processor
 * Handles messages loaded from /messages API endpoint
 *
 * Expected input structure (from the messages array you shared):
 * {
 *   info: { role, id, sessionID, mode, agent, created, model, ... },
 *   parts: [ { text, type } ],
 *   messageId: "...",
 *   sessionId: "...",
 *   type: "message.loaded" | etc,
 *   // ...other flat properties
 * }
 */
import { logger } from '@/shared/services/logger';
import { apiClient } from '@/shared/services/api/client';
import { classifyMessage, groupUnclassifiedMessages, groupAllMessages } from './messageClassifier';
import { generateMessageId } from './messageIdGenerator';

const historicalLogger = logger.tag('HistoricalPreprocessor');

/**
 * Pre-processes a single historical message
 * @param {Object} rawMessage - Raw historical message from API
 * @param {Object} options - Processing options
 * @returns {Object} - Pre-processed message
 */
export const preprocessHistoricalMessage = (rawMessage, options = {}) => {
  const { includeRaw = false, sessionId = null, projectName = null } = options;

  if (!rawMessage || typeof rawMessage !== 'object') {
    historicalLogger.warn('Invalid historical message received');
    return createInvalidHistoricalMessage('Invalid historical message');
  }

  // Detect structure type
  const structureType = detectHistoricalStructure(rawMessage);

  if (structureType === 'unknown') {
    historicalLogger.warn('Unknown historical message structure', {
      hasInfo: !!rawMessage.info,
      hasParts: !!rawMessage.parts,
      hasProperties: !!rawMessage.properties,
      hasMessageId: !!rawMessage.messageId,
      hasId: !!rawMessage.id,
      type: rawMessage.type,
      keys: Object.keys(rawMessage).join(', '),
    });
    return createInvalidHistoricalMessage('Unknown structure');
  }

  // Extract common fields
  const info = rawMessage.info || {};
  const parts = rawMessage.parts || rawMessage.properties?.parts || [];
  const messageId = rawMessage.messageId || rawMessage.id || info.id || generateId();

  // Extract session ID
  const extractedSessionId =
    rawMessage.sessionId || rawMessage.session_id || info.sessionID || sessionId;

  // Extract role - MUST use info.role for proper classification
  const extractedRole = info.role || rawMessage.role || null;

  historicalLogger.debug('Processing historical message', {
    hasInfo: !!rawMessage.info,
    infoRole: info.role,
    rawRole: rawMessage.role,
    extractedRole,
    rawType: rawMessage.type,
    infoType: info.type,
    propsType: rawMessage.properties?.type,
    keys: Object.keys(rawMessage).slice(0, 20).join(', '),
    hasParts: parts.length > 0,
  });

  // Infer role from message type (user/system cases only)
  if (!extractedRole) {
    const msgType = rawMessage.type?.toLowerCase();
    if (msgType === 'user' || msgType === 'sent' || msgType === 'message.created') {
      extractedRole = 'user';
    } else if (msgType === 'system' || msgType === 'system_message') {
      extractedRole = 'system';
    }
  }

  // Check parts for assistant indicators (reasoning/output = assistant)
  if (!extractedRole && parts.length > 0) {
    const hasReasoning = parts.some(p => p.type === 'reasoning');
    const hasOutput = parts.some(p => p.type === 'output');

    if (hasReasoning || hasOutput) {
      extractedRole = 'assistant';
    }
  }

  const hasReasoning = parts.some(p => p.type === 'reasoning');
  const messageType = hasReasoning ? 'reasoning' : 'text';

  // Pre-processed message structure
  const processed = {
    // Source identification
    source: 'historical',
    messageId,
    sessionId: extractedSessionId,
    payloadType: rawMessage.type,
    timestamp: info.created ? new Date(info.created).getTime() : Date.now(),

    role: extractedRole,
    type: messageType,
    agent: info.agent || rawMessage.agent || null,
    mode: info.mode || rawMessage.mode || 'build',

    // Text content from parts
    text: extractHistoricalText(parts, rawMessage),

    // All parts for detailed display (handle both content and text fields)
    parts: parts.map(part => ({
      type: part.type,
      text: part.content || part.text,
      contentType: part.contentType,
    })),

    // Reasoning content (handle both content and text fields)
    reasoning:
      parts.find(p => p.type === 'reasoning')?.content ||
      parts.find(p => p.type === 'reasoning')?.text ||
      null,

    // Metadata
    model: info.model || rawMessage.model || null,
    createdAt: info.created || rawMessage.created || null,
    updatedAt: info.updated || rawMessage.updated || null,

    // Project context
    projectName: projectName || rawMessage.projectName || null,

    // Completion status
    isComplete: true, // Historical messages are always complete

    // Raw data for debugging
    ...(includeRaw && { rawData: rawMessage }),
  };

  historicalLogger.debug('Historical message pre-processed', {
    type: processed.type,
    hasText: !!processed.text,
    partsCount: parts.length,
  });

  return processed;
};

/**
 * Batch pre-process historical messages
 * @param {Array} messages - Array of historical messages from API
 * @param {Object} options - Processing options
 * @returns {Array} - Array of pre-processed messages
 */
export const preprocessHistoricalMessages = (messages, options = {}) => {
  if (!Array.isArray(messages)) {
    historicalLogger.warn('preprocessHistoricalMessages received non-array');
    return [];
  }

  const processed = messages.map(msg => preprocessHistoricalMessage(msg, options));

  historicalLogger.debug(`Pre-processed ${processed.length} historical messages`);

  return processed;
};

/**
 * Detects the structure type of a historical message
 */
const detectHistoricalStructure = message => {
  // Check for "loaded" structure (info + parts at top level)
  if (message.info && (message.parts || message.properties?.parts)) {
    return 'loaded';
  }

  // Check for "flat" structure (direct properties)
  if (message.properties?.info || message.info) {
    return 'flat';
  }

  // Check for minimal structure
  if (message.messageId || message.id || message.type) {
    return 'minimal';
  }

  return 'unknown';
};

/**
 * Extracts text content from historical message parts
 * Handles multiple part structures seen in /messages API response
 */
const extractHistoricalText = (parts, rawMessage) => {
  // Priority 1: Check for parts array with 'content' or 'text' field
  if (Array.isArray(parts) && parts.length > 0) {
    // Try extracting from parts with type === 'text'
    const textParts = parts
      .filter(part => part && (part.type === 'text' || part.type === 'output'))
      .map(part => part.content || part.text || '')
      .filter(text => text.length > 0);

    if (textParts.length > 0) {
      return textParts.join('\n');
    }

    // Try ANY part with content/text (less strict)
    const anyParts = parts
      .filter(part => part && (part.content || part.text))
      .map(part => part.content || part.text)
      .join('\n');

    if (anyParts.length > 0) {
      return anyParts;
    }
  }

  // Priority 2: Direct message field
  if (rawMessage.message && typeof rawMessage.message === 'string') {
    return rawMessage.message;
  }

  // Priority 3: Info summary
  if (rawMessage.info?.summary?.body) {
    return rawMessage.info.summary.body;
  }

  // Priority 4: info.message
  if (rawMessage.info?.message && typeof rawMessage.info.message === 'string') {
    return rawMessage.info.message;
  }

  // Priority 5: Check for nested parts structure
  if (rawMessage.parts?.parts && Array.isArray(rawMessage.parts.parts)) {
    const nestedParts = rawMessage.parts.parts
      .filter(part => part && (part.content || part.text))
      .map(part => part.content || part.text)
      .join('\n');

    if (nestedParts.length > 0) {
      return nestedParts;
    }
  }

  return null;
};

/**
 * Creates an invalid message placeholder for historical
 */
const createInvalidHistoricalMessage = reason => ({
  source: 'historical',
  type: 'invalid',
  error: true,
  text: null,
  messageId: generateId(),
  timestamp: Date.now(),
});

/**
 * Generates a unique ID
 */
const generateId = () => {
  return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Sorts historical messages by timestamp
 */
export const sortHistoricalMessagesByTime = messages => {
  return [...messages].sort((a, b) => {
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
};

/**
 * Groups historical messages by conversation/session
 */
export const groupHistoricalMessages = (messages, groupBy = 'sessionId') => {
  const groups = {};

  messages.forEach(message => {
    const key = message[groupBy] || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(message);
  });

  return groups;
};

/**
 * Load historical messages from API and return fully classified events
 * Consolidates API call, preprocessing, and classification into single operation
 *
 * @param {Object} params - Parameters
 * @param {string} params.baseUrl - Server base URL
 * @param {string} params.sessionId - Session ID
 * @param {Object} params.selectedProject - Selected project (optional)
 * @param {number} params.limit - Message limit (default: 20)
 * @param {string} params.before - Pagination token (optional)
 * @returns {Promise<Object>} - Classified events with metadata
 */
export const loadHistoricalMessages = async ({
  baseUrl,
  sessionId,
  selectedProject = null,
  limit = 20,
  before = null,
}) => {
  historicalLogger.debug('loadHistoricalMessages ENTRY', {
    baseUrl,
    sessionId,
    hasProject: !!selectedProject,
    limit,
    before,
  });

  if (!baseUrl || !sessionId) {
    historicalLogger.warn('loadHistoricalMessages called without baseUrl or sessionId');
    return {
      events: [],
      unclassifiedMessages: [],
      groupedUnclassifiedMessages: {},
      groupedAllMessages: {},
    };
  }

  try {
    historicalLogger.debug('Loading historical messages', { sessionId, limit, before });

    // Build URL
    let url = `${baseUrl}/session/${sessionId}/message?limit=${limit}`;
    if (before) {
      url += `&before=${before}`;
    }

    // Make API call
    const response = await apiClient.get(
      url,
      {
        headers: { Accept: 'application/json' },
      },
      selectedProject,
    );

    const data = await apiClient.parseJSON(response);

    if (!data || !Array.isArray(data)) {
      historicalLogger.warn('API response is not an array', { data });
      return {
        events: [],
        unclassifiedMessages: [],
        groupedUnclassifiedMessages: {},
        groupedAllMessages: {},
      };
    }

    historicalLogger.debug('API response received', { count: data.length });

    // Preprocess all messages
    const projectName = selectedProject?.name || selectedProject?.path || null;
    const normalizedMessages = preprocessHistoricalMessages(data, {
      sessionId,
      projectName,
    });

    // Classify all messages
    const seenMessageIds = new Set();
    const events = [];
    const unclassifiedMessages = [];
    const allMessages = [];

    normalizedMessages.forEach(item => {
      // Bridge: new preprocessor uses 'text', legacy expects 'message'
      const messageForClassification = {
        ...item,
        message: item.text || item.message,
      };

      const classified = classifyMessage(messageForClassification);

      if (!classified) {
        return;
      }

      // Set session ID if not present
      if (!classified.sessionId) {
        classified.sessionId = sessionId;
      }

      // Set project name if not present
      if (selectedProject && !classified.projectName) {
        classified.projectName = selectedProject.name || selectedProject.path || null;
      }

      // Set ID if not present
      if (!classified.id) {
        classified.id = classified.messageId || generateMessageId();
      }

      // Bridge: preserve text from preprocessor
      if (item.text && !classified.message) {
        classified.message = item.text;
      }

      // Bridge: preserve reasoning from preprocessor
      if (item.reasoning) {
        classified.reasoning = item.reasoning;
      }

      // Track seen message IDs to avoid duplicates
      if (classified.messageId) {
        if (seenMessageIds.has(classified.messageId)) {
          historicalLogger.debug('Skipping duplicate message', { messageId: classified.messageId });
          return;
        }
        seenMessageIds.add(classified.messageId);
      }

      // Categorize messages
      if (classified.category === 'unclassified') {
        unclassifiedMessages.push(classified);
      }

      allMessages.push(classified);
      events.push(classified);
    });

    historicalLogger.debug('Messages loaded and classified', { count: events.length });

    return {
      events,
      unclassifiedMessages,
      groupedUnclassifiedMessages: groupUnclassifiedMessages(unclassifiedMessages),
      groupedAllMessages: groupAllMessages(allMessages),
      count: events.length,
    };
  } catch (error) {
    historicalLogger.error('Failed to load historical messages', error);
    return {
      events: [],
      unclassifiedMessages: [],
      groupedUnclassifiedMessages: {},
      groupedAllMessages: {},
      error: error.message,
    };
  }
};
