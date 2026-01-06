import { getProjectDisplayName } from "@/shared/helpers/formatting";

/**
 * Message classification utility for opencode SSE messages
 * @param {import('@/shared/types/opencode.types.js').GlobalEvent} item - The SSE message item to classify
 * @param {string} currentMode - Current mode ('build' or 'plan')
 * @returns {Object} - Classified message with metadata
 */
export const classifyMessage = (item, currentMode = "build") => {
  // Validate input structure
  if (!item || typeof item !== "object") {
    console.warn("⚠️ classifyMessage received invalid input:", item);
    return createFallbackMessage(item);
  }

  const payloadType = item.payload?.type || "unknown";
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

  // Handle session status messages specially (for thinking indicator)
  if (payloadType === "session.status") {
    const statusType = item.payload?.properties?.status?.type;
    if (statusType === "busy" || statusType === "idle") {
      return {
        type: "session_status",
        category: "internal", // Don't show in UI
        projectName:
          item.projectName ||
          getProjectDisplayName(item.directory) ||
          "Unknown Project",
        displayMessage: `Session status: ${statusType}`,
        rawData: item,
        icon: "🔄",
        sessionId: sessionId,
        payloadType: payloadType,
        sessionStatus: statusType,
        mode: (currentMode !== null ? currentMode : item.info?.mode) || "build",
      };
    }
  }

  // Handle loaded messages from API
  if (payloadType === "message.loaded") {
    try {
      // Extract text from parts
      const parts = item.payload?.properties?.parts || [];
      const textContent = Array.isArray(parts)
        ? parts
            .filter((part) => part && part.type === "text")
            .map((part) => part.text || "")
            .join("\n")
        : "No content available";

      // Classify based on role
      const role = item.payload?.properties?.info?.role;
      const messageType = role === "user" ? "sent" : "loaded_message";

      return {
        type: messageType,
        category: "message", // Show in main chat (historical messages)
        projectName:
          item.projectName ||
          getProjectDisplayName(item.directory) ||
          "Unknown Project",
        message: textContent,
        rawData: item,
        icon: role === "user" ? "User" : "Check",
        sessionId: sessionId,
        payloadType: payloadType,
        messageId: item.payload?.properties?.info?.id || null,
        mode: (currentMode !== null ? currentMode : item.info?.mode) || "build",
      };
    } catch (error) {
      console.error("❌ Error processing loaded message:", error);
      return {
        type: "unclassified",
        category: "unclassified",
        projectName:
          item.projectName ||
          getProjectDisplayName(item.directory) ||
          "Unknown Project",
        displayMessage: "Error loading message",
        rawData: item,
        icon: "❌",
        sessionId: sessionId,
        payloadType: payloadType,
        mode: (currentMode !== null ? currentMode : item.info?.mode) || "build",
      };
    }
  }

  // message.updated events are treated as finalized messages
  if (payloadType === "message.updated") {
    console.debug("🔄 MESSAGE.UPDATED RECEIVED:", {
      sessionId,
      hasSummaryBody: !!summaryBody,
      summaryBodyLength: summaryBody ? summaryBody.length : 0,
      agent: item.payload?.properties?.info?.agent,
      messageId: item.payload?.properties?.info?.id,
    });

    // Only finalize if summaryBody is a non-empty string
    if (summaryBody && typeof summaryBody === "string" && summaryBody.trim()) {
      console.debug(
        "✅ FINALIZING MESSAGE:",
        summaryBody.substring(0, 100) + "...",
      );
      return {
        type: "message_finalized",
        category: "message",
        projectName:
          item.projectName ||
          getProjectDisplayName(item.directory) ||
          "Unknown Project",
        message: summaryBody, // Use the body content directly
        rawData: item,
        icon: "✅",
        sessionId: sessionId,
        payloadType: payloadType,
        messageId: item.payload?.properties?.info?.id || null,
        mode: item.payload?.properties?.info?.agent || "build",
      };
    } else {
      console.debug(
        "🚫 INCOMPLETE MESSAGE.UPDATE - treating as unclassified (debug only) - raw data:",
        JSON.stringify(item, null, 2),
      );
      return {
        type: "message_update_incomplete",
        category: "unclassified", // Show in debug screen only
        projectName:
          item.projectName ||
          getProjectDisplayName(item.directory) ||
          "Unknown Project",
        displayMessage: "Incomplete message.update - missing summary body",
        rawData: item,
        icon: "🚫",
        sessionId: sessionId,
        payloadType: payloadType,
        mode: item.info?.mode || "build",
      };
    }
  }

  // Handle todo update messages
  if (payloadType === "todo.update") {
    const todos = item.payload?.properties?.todos || [];
    return {
      type: "todo_updated",
      category: "internal", // Don't show in UI
      projectName:
        item.projectName ||
        getProjectDisplayName(item.directory) ||
        "Unknown Project",
      displayMessage: `Todo list updated: ${todos.length} tasks`,
      rawData: item,
      icon: "📋",
      sessionId: sessionId,
      payloadType: payloadType,
      todos: todos,
      mode: item.info?.mode || "build",
    };
  }

  // Handle system reminder messages
  if (payloadType === "system-reminder") {
    return {
      type: "system_reminder",
      category: "internal", // Don't show in UI - system internal messages
      projectName:
        item.projectName ||
        getProjectDisplayName(item.directory) ||
        "Unknown Project",
      displayMessage: "System reminder message",
      message: undefined, // Ensure no object message
      rawData: item,
      icon: "ℹ️",
      sessionId: sessionId,
      payloadType: payloadType,
      mode: item.info?.mode || "build",
    };
  }

  // Handle messages with parts (incoming SSE messages)
  if (item.parts && Array.isArray(item.parts)) {
    const textParts = item.parts.filter((part) => part && part.type === "text");
    if (textParts.length > 0) {
      const textContent = textParts.map((part) => part.text || "").join("\n");
      const role = item.info?.role;
      const messageType = role === "user" ? "sent" : "parts_message";

      return {
        type: messageType,
        category: "message", // Show in main chat (historical messages)
        projectName:
          item.projectName ||
          getProjectDisplayName(item.directory) ||
          "Unknown Project",
        message: textContent,
        rawData: item,
        icon: role === "user" ? "User" : "Check",
        sessionId: sessionId,
        payloadType: payloadType,
        messageId: item.info?.id || null,
        mode: item.info?.mode || item.info?.agent || "build",
      };
    }
  }

  // EVERYTHING else goes to unclassified (debug screen only)
  // console.debug('📋 MESSAGE CLASSIFIED AS UNCLASSIFIED:', {
  //   payloadType,
  //   hasSummaryBody: !!summaryBody,
  //   summaryBodyType: typeof summaryBody,
  //   summaryBodyLength: summaryBody ? String(summaryBody).length : 0,
  //   hasMessage: !!item.message,
  //   messageType: typeof item.message,
  //   rawPayloadKeys: item.payload ? Object.keys(item.payload) : 'no payload'
  // });

  // Ensure we have a string message for UI rendering
  let displayMessage = "Unknown message type";
  let message = undefined; // Default to undefined for safety

  if (typeof item.message === "string" && item.message) {
    displayMessage = item.message;
    message = item.message; // Safe string
  } else if (summaryBody && typeof summaryBody === "string") {
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
    type: "unclassified",
    category: "unclassified",
    projectName:
      item.projectName ||
      getProjectDisplayName(item.directory) ||
      "Unknown Project",
    displayMessage: displayMessage,
    message: message, // Always a string or undefined
    rawData: item,
    icon: "Warning",
    sessionId: sessionId,
    payloadType: payloadType,
    mode: item.info?.mode || "build",
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
export const groupUnclassifiedMessages = (messages) => {
  const grouped = {};

  // Handle undefined or non-array input
  if (!Array.isArray(messages)) {
    console.warn(
      "⚠️ groupUnclassifiedMessages received non-array input:",
      messages,
    );
    return grouped;
  }

  messages.forEach((message) => {
    if (message.category === "unclassified") {
      const payloadType = message.payloadType || "unknown";
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
export const groupAllMessages = (messages) => {
  const grouped = {
    classified: {},
    unclassified: {},
  };

  messages.forEach((message) => {
    const category =
      message.category === "unclassified" ? "unclassified" : "classified";
    const type = message.type || message.payloadType || "unknown";

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
const createFallbackMessage = (rawMessage) => {
  return {
    type: "unclassified",
    category: "unclassified",
    projectName: "Unknown Project",
    displayMessage: "Unable to classify message structure",
    message: undefined, // Don't set message to avoid object display
    rawData: rawMessage,
    icon: "❌",
    sessionId: rawMessage?.sessionId || rawMessage?.session_id || null,
    payloadType: "unknown",
  };
};
