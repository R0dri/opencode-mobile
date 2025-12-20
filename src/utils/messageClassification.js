import { getProjectDisplayName } from './projectManager.js';

/**
 * Message classification utility for opencode SSE messages
 * @param {import('./opencode-types.js').GlobalEvent} item - The SSE message item to classify
 * @returns {Object} - Classified message with metadata
 */
export const classifyMessage = (item) => {
  const payloadType = item.payload?.type || 'unknown';
  const summaryBody = item.payload?.properties?.info?.summary?.body;

  // Fix session ID extraction - check multiple possible locations
  const sessionId = item.session_id ||
                    item.sessionId ||
                    item.payload?.properties?.sessionID ||
                    item.payload?.properties?.info?.sessionID ||
                    item.payload?.properties?.part?.sessionID || // For message.part.updated
                    null;



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
        sessionStatus: statusType
      };
    }
  }

  // ONLY message.updated with summary.body gets displayed in chat
  if (payloadType === 'message.updated' && summaryBody) {
    // ✅ ONLY THIS CASE gets displayed in chat

    return {
      type: 'message_finalized',
      category: 'message',
      projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
      displayMessage: summaryBody, // Use the body content directly
      rawData: item,
      icon: '✅',
      sessionId: sessionId,
      payloadType: payloadType,
      messageId: item.payload?.properties?.info?.id || null
    };
  }

  // EVERYTHING else goes to unclassified (debug screen only)

  return {
    type: 'unclassified',
    category: 'unclassified',
    projectName: item.projectName || getProjectDisplayName(item.directory) || 'Unknown Project',
    displayMessage: JSON.stringify(item, null, 2),
    rawData: item,
    icon: '⚠️',
    sessionId: sessionId,
    payloadType: payloadType
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
    return `${icon} ${classification.toUpperCase()}\n📁 ${projectName}\n📝 ${type}\n⚠️ Missing info data`;
  }

  const { role, agent, id } = info;

  return `${icon} ${classification.toUpperCase()}\n📁 ${projectName}\n📝 ${type}\n👤 ${role} (${agent})\n💬 ${id}`;
};

/**
 * Group unclassified messages by payload type for debugging
 * @param {Array} messages - Array of classified messages
 * @returns {Object} - Grouped messages by payload type
 */
export const groupUnclassifiedMessages = (messages) => {
  const grouped = {};

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