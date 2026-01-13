import { getProjectDisplayName } from '@/shared/helpers/formatting';
import { logger } from '@/shared/services/logger';

const messageLogger = logger.tag('Message');

/**
 * Message classification utility for opencode SSE messages
 * @param {import('@/shared/types/opencode.types.js').GlobalEvent} item - The SSE message item to classify
 * @param {string} currentMode - Current mode ('build' or 'plan')
 * @returns {Object} - Classified message with metadata
 */
export const classifyMessage = (item, currentMode = 'build') => {
  // Validate input structure
  if (!item || typeof item !== 'object') {
    messageLogger.warn('classifyMessage received invalid input', item);
    return createFallbackMessage(item);
  }

  const payloadType = item.payloadType || item.payload?.type || 'unknown';
  const summaryBody = item.payload?.properties?.info?.summary?.body;

  // Fix session ID extraction - check multiple possible locations
  const sessionId =
    item.session_id ||
    item.sessionId ||
    item.info?.sessionID || // For incoming SSE messages
    item.payload?.properties?.sessionID ||
    item.payload?.properties?.info?.sessionID ||
    item.payload?.properties?.part?.sessionID || // For message.part.updated
    null;

  if (payloadType === 'session.error') {
    const errorData = item.payload?.properties?.error;
    const errorMessage = errorData?.data?.message || errorData?.message || 'An error occurred';
    const errorName = errorData?.name || 'Error';
    const statusCode = errorData?.data?.statusCode || null;

    return {
      type: 'error',
      category: 'message',
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      displayMessage: `${errorName}: ${errorMessage}${statusCode ? ` (Status: ${statusCode})` : ''}`,
      rawData: item,
      icon: '❌',
      sessionId: sessionId,
      payloadType: payloadType,
      mode: (currentMode !== null ? currentMode : item.info?.mode) || 'build',
      errorData: errorData,
    };
  }

  // Handle session status messages specially (for thinking indicator)
  if (payloadType === 'session.status') {
    const statusType = item.payload?.properties?.status?.type;
    if (statusType === 'busy' || statusType === 'idle') {
      return {
        type: 'session_status',
        category: 'internal', // Don't show in UI
        projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
        displayMessage: `Session status: ${statusType}`,
        rawData: item,
        icon: '🔄',
        sessionId: sessionId,
        payloadType: payloadType,
        sessionStatus: statusType,
        mode: (currentMode !== null ? currentMode : item.info?.mode) || 'build',
      };
    }
  }

  if (payloadType === 'session.idle') {
    return {
      type: 'session_status',
      category: 'internal', // Don't show in UI
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      displayMessage: 'Session status: idle',
      rawData: item,
      icon: '🔄',
      sessionId: sessionId,
      payloadType: payloadType,
      sessionStatus: 'idle',
      mode: (currentMode !== null ? currentMode : item.info?.mode) || 'build',
    };
  }

  // Handle loaded messages from API
  if (payloadType === 'message.loaded') {
    try {
      // Extract text from parts
      const parts = item.payload?.properties?.parts || [];
      const textContent = Array.isArray(parts)
        ? parts
            .filter(part => part && part.type === 'text')
            .map(part => part.text || '')
            .join('\n')
        : 'No content available';

      // Filter out synthetic messages (system-generated user messages)
      const hasSyntheticPart = parts.some(part => part && part.synthetic === true);
      if (hasSyntheticPart) {
        messageLogger.debugCtx('MESSAGE_PROCESSING', 'Filtering out synthetic message', {
          messageId: item.payload?.properties?.info?.id,
          sessionId,
        });
        return null;
      }

      // Classify based on role - check both preprocessed (item.role) and raw (payload) formats
      const role = item.payload?.properties?.info?.role || item.role || null;
      // Preserve type from preprocessed messages (reasoning/text), don't override
      const messageType = item.type || (role === 'user' ? 'sent' : 'loaded_message');

      return {
        type: messageType,
        category: 'message', // Show in main chat (historical messages)
        projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
        message: textContent,
        rawData: item,
        icon: role === 'user' ? 'User' : 'Check',
        sessionId: sessionId,
        payloadType: payloadType,
        messageId: item.payload?.properties?.info?.id || item.messageId || null,
        role: role,
        source: item.source || 'historical', // Preserve source from preprocessed messages
        mode: (currentMode !== null ? currentMode : item.info?.mode) || 'build',
      };
    } catch (error) {
      messageLogger.error('Error processing loaded message', error);
      return {
        type: 'unclassified',
        category: 'unclassified',
        projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
        displayMessage: 'Error loading message',
        rawData: item,
        icon: '❌',
        sessionId: sessionId,
        payloadType: payloadType,
        mode: (currentMode !== null ? currentMode : item.info?.mode) || 'build',
      };
    }
  }

  // Handle partial message updates (streaming text/reasoning parts)
  if (payloadType === 'message.part.updated') {
    const part = item.payload?.properties?.part;
    const partType = part?.type || 'unknown';
    const partText = part?.text || '';
    const delta = item.payload?.properties?.delta || '';
    const messageId = part?.messageID || item.payload?.properties?.info?.id || null;
    const partId = part?.id || null;

    messageLogger.debugCtx('MESSAGE_PROCESSING', 'Message.part.updated received', {
      messageId,
      partId,
      partType,
      textLength: partText.length,
      hasDelta: !!delta,
    });

    return {
      type: 'partial_message',
      category: 'partial', // Special category for accumulating parts
      partId: partId,
      messageId: messageId,
      partType: partType, // 'text' or 'reasoning'
      text: partText,
      delta: delta,
      sessionId: sessionId,
      payloadType: payloadType,
      rawData: item,
      icon: partType === 'reasoning' ? '🤔' : '📝',
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      mode: item.info?.mode || item.payload?.properties?.info?.agent || 'build',
    };
  }

  // message.updated events are treated as finalized messages
  if (payloadType === 'message.updated') {
    const messageId = item.payload?.properties?.info?.id || null;
    const role = item.payload?.properties?.info?.role || null;
    const agent = item.payload?.properties?.info?.agent || null;

    if (role === 'user' && agent) {
      messageLogger.debugCtx(
        'MESSAGE_PROCESSING',
        'Skipping contradictory message (role=user with agent)',
        {
          messageId,
          agent,
        },
      );
      return null;
    }

    messageLogger.debugCtx('MESSAGE_PROCESSING', 'Message.updated received', {
      sessionId,
      hasSummaryBody: !!summaryBody,
      summaryBodyLength: summaryBody ? summaryBody.length : 0,
      agent,
      messageId,
      role,
    });

    // Try summary.body first
    if (summaryBody && typeof summaryBody === 'string' && summaryBody.trim()) {
      messageLogger.debug('Finalizing message from summary.body', {
        preview: summaryBody.substring(0, 100) + '...',
      });
      return {
        type: 'message_finalized',
        category: 'message',
        projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
        message: summaryBody, // Use the body content directly
        rawData: item,
        icon: '✅',
        sessionId: sessionId,
        payloadType: payloadType,
        messageId: messageId,
        role: role,
        mode: item.payload?.properties?.info?.agent || 'build',
      };
    }

    // Fallback: Mark as needing assembly from parts (will be assembled by useMessageProcessing)
    messageLogger.debugCtx(
      'MESSAGE_PROCESSING',
      'Message.updated without summary.body - will assemble from parts',
      {
        messageId,
        sessionId,
        role,
      },
    );

    return {
      type: 'message_finalized',
      category: 'message',
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      message: null, // Will be assembled from partial messages
      rawData: item,
      icon: '✅',
      sessionId: sessionId,
      payloadType: payloadType,
      messageId: messageId,
      role: role,
      assembledFromParts: true, // Flag to trigger assembly in useMessageProcessing
      mode: item.payload?.properties?.info?.agent || 'build',
    };
  }

  // Handle todo update messages
  if (payloadType === 'todo.update') {
    const todos = item.payload?.properties?.todos || [];
    return {
      type: 'todo_updated',
      category: 'internal', // Don't show in UI
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      displayMessage: `Todo list updated: ${todos.length} tasks`,
      rawData: item,
      icon: '📋',
      sessionId: sessionId,
      payloadType: payloadType,
      todos: todos,
      mode: item.info?.mode || 'build',
    };
  }

  // Handle system reminder messages
  if (payloadType === 'system-reminder') {
    return {
      type: 'system_reminder',
      category: 'internal', // Don't show in UI - system internal messages
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      displayMessage: 'System reminder message',
      message: undefined, // Ensure no object message
      rawData: item,
      icon: 'ℹ️',
      sessionId: sessionId,
      payloadType: payloadType,
      mode: item.info?.mode || 'build',
    };
  }

  // Handle messages with parts (incoming SSE messages)
  if (item.parts && Array.isArray(item.parts)) {
    const textParts = item.parts.filter(part => part && part.type === 'text');
    if (textParts.length > 0) {
      const textContent = textParts.map(part => part.text || '').join('\n');
      // Check both preprocessed (item.role) and raw (payload) formats
      const role = item.info?.role || item.role || null;
      // Preserve type from preprocessed messages (reasoning/text), don't override
      const messageType = item.type || (role === 'user' ? 'sent' : 'loaded_message');

      return {
        type: messageType,
        category: 'message', // Show in main chat (historical messages)
        projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
        message: textContent,
        rawData: item,
        icon: role === 'user' ? 'User' : 'Check',
        sessionId: sessionId,
        payloadType: payloadType,
        messageId: item.info?.id || item.messageId || null,
        role: role,
        source: item.source || 'sse', // Preserve source from preprocessed messages
        mode: item.info?.mode || item.info?.agent || 'build',
      };
    }
  }

  // EVERYTHING else goes to unclassified (debug screen only)
  // messageLogger.debugCtx('MESSAGE_PROCESSING', 'Message classified as unclassified', {
  //   payloadType,
  //   hasSummaryBody: !!summaryBody,
  //   summaryBodyType: typeof summaryBody,
  //   summaryBodyLength: summaryBody ? String(summaryBody).length : 0,
  //   hasMessage: !!item.message,
  //   messageType: typeof item.message,
  //   rawPayloadKeys: item.payload ? Object.keys(item.payload) : 'no payload'
  // });

  // Ensure we have a string message for UI rendering
  let displayMessage = 'Unknown message type';
  let message = undefined; // Default to undefined for safety

  if (typeof item.message === 'string' && item.message) {
    displayMessage = item.message;
    message = item.message; // Safe string
  } else if (summaryBody && typeof summaryBody === 'string') {
    displayMessage = summaryBody;
    message = summaryBody; // Safe string
  } else {
    // Fallback: stringify the payload or the whole item
    displayMessage = item.payload
      ? JSON.stringify(item.payload, null, 2)
      : JSON.stringify(item, null, 2);
    message = undefined; // Don't set message to object
  }

  return {
    type: 'unclassified',
    category: 'unclassified',
    projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
    displayMessage: displayMessage,
    message: message, // Always a string or undefined
    rawData: item,
    icon: 'Warning',
    sessionId: sessionId,
    payloadType: payloadType,
    mode: item.info?.mode || 'build',
  };
};

/**
 * Format message for display with classification
 * @param {Object} item - Raw message item
 * @param {string} projectName - Extracted project name
 * @param {string} classification - Message classification
 * @param {string} icon - Display icon
 * @returns {string} - Formatted display message
 */
const formatClassifiedMessage = (item, projectName, classification, icon) => {
  const { payload } = item;
  const { type, properties } = payload;
  const { info } = properties || {};

  if (!info) {
    return `${icon} ${classification.toUpperCase()}\nProject: ${projectName}\nType: ${type}\nWarning: Missing info data`;
  }

  const { role, agent, id } = info;

  return `${icon} ${classification.toUpperCase()}\nProject: ${projectName}\nType: ${type}\nRole: ${role} (${agent})\nID: ${id}`;
};

/**
 * Group unclassified messages by payload type for debugging
 * @param {Array} messages - Array of classified messages
 * @returns {Object} - Grouped messages by payload type
 */
export const groupUnclassifiedMessages = messages => {
  const grouped = {};

  // Handle undefined or non-array input
  if (!Array.isArray(messages)) {
    messageLogger.warn('groupUnclassifiedMessages received non-array input', messages);
    return grouped;
  }

  messages.forEach(message => {
    if (message.category === 'unclassified') {
      const payloadType = message.payloadType || 'unknown';
      if (!grouped[payloadType]) {
        grouped[payloadType] = [];
      }
      grouped[payloadType].push(message);
    }
  });

  return grouped;
};

/**
 * Group all messages by classification category and type for debugging
 * @param {Array} messages - Array of all classified messages
 * @returns {Object} - Grouped messages by category and type
 */
export const groupAllMessages = messages => {
  const grouped = {
    classified: {},
    unclassified: {},
  };

  messages.forEach(message => {
    const category = message.category === 'unclassified' ? 'unclassified' : 'classified';
    const type = message.type || message.payloadType || 'unknown';

    if (!grouped[category][type]) {
      grouped[category][type] = [];
    }
    grouped[category][type].push(message);
  });

  return grouped;
};

/**
 * Creates a fallback message for invalid/unparseable messages
 * @param {Object} rawMessage - Raw message that couldn't be classified
 * @returns {Object} - Basic unclassified message structure
 */
const createFallbackMessage = rawMessage => {
  return {
    type: 'unclassified',
    category: 'unclassified',
    projectName: 'Unknown Project',
    displayMessage: 'Unable to classify message structure',
    message: undefined, // Don't set message to avoid object display
    rawData: rawMessage,
    icon: '❌',
    sessionId: rawMessage?.sessionId || rawMessage?.session_id || null,
    payloadType: 'unknown',
  };
};
