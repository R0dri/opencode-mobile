/**
 * EventItem component for displaying individual SSE event messages
 * Fixed version with simplified styling
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Clipboard from 'expo-clipboard';
import { AccessibilityInfo } from 'react-native';
import { logger } from '@/shared/services/logger';
import { getAgentColor } from '@/shared/utils/agentColorUtils';

const messageLogger = logger.tag('Message');

/**
 * Get styles for EventItem component
 */
const getStyles = (theme, isPlanMode = false, agent = null) => {
  const agentColor = agent
    ? getAgentColor(agent, 0, theme.isDark ? 'dark' : 'light')
    : theme.colors.accent;

  return StyleSheet.create({
    eventContainer: { marginBottom: 8 },
    leftAlignedContainer: { alignItems: 'flex-start' },
    rightAlignedContainer: { alignItems: 'flex-end' },
    eventItem: {
      padding: 12,
      marginBottom: 12,
      borderRadius: 0,
      borderLeftWidth: 4,
      borderRightWidth: 0,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    messageItem: {
      backgroundColor: theme.colors.surface,
      borderLeftColor: agentColor,
      borderLeftWidth: 4,
    },
    planMessageItem: {
      backgroundColor: theme.colors.surface,
      borderLeftColor: agentColor,
      borderLeftWidth: 4,
    },
    reasoningItem: {
      backgroundColor: theme.colors.background, // Blend with app background
      borderLeftColor: theme.colors.borderLight, // Subtle gray bar
      borderLeftWidth: 3,
    },
    errorItem: {
      backgroundColor: theme.colors.errorBackground,
      borderLeftColor: theme.colors.statusUnreachable,
      borderLeftWidth: 4,
    },
    streamingItem: {
      backgroundColor: theme.colors.surfaceSecondary,
      borderLeftColor: theme.colors.statusConnecting,
      borderLeftWidth: 4,
    },
    sentItem: {
      backgroundColor: theme.colors.surface,
      borderRightColor: theme.colors.success,
      borderRightWidth: 4,
      borderLeftWidth: 0,
    },
    markdownContainer: { alignSelf: 'flex-start' },
    messageMessage: { color: theme.colors.textPrimary },
    sentMessage: { color: theme.colors.accentSecondary },
    errorMessage: { color: theme.colors.errorText },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    debugIdBadge: {
      fontSize: 9,
      fontFamily: 'monospace',
      color: theme.colors.textSecondary,
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
      alignSelf: 'flex-start',
      flex: 1,
    },
  });
};

/**
 * Get markdown styles for EventItem
 */
const getMarkdownStyles = theme => ({
  body: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 20 },
  heading1: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  heading2: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  heading3: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  link: { color: theme.colors.accent, textDecorationLine: 'underline' },
  code_inline: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.border,
    paddingLeft: 8,
    marginLeft: 8,
    fontStyle: 'italic',
    backgroundColor: theme.colors.surface,
  },
  list_item: { marginBottom: 4 },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
});

const EventItem = ({ item, theme, markdownStyles, onCopy, showToast, showMeta = true }) => {
  if (item.type === 'connection' || item.type === 'session_status' || item.type === 'system') {
    return null;
  }

  const handleCopy = useCallback(async () => {
    let content = '';
    if (typeof item.message === 'string') {
      content = item.message;
    } else if (item.displayMessage && typeof item.displayMessage === 'string') {
      content = item.displayMessage;
    } else {
      content = JSON.stringify(item.message || item.payload || item, null, 2);
    }

    await Clipboard.setString(content);
    if (onCopy) {
      onCopy();
    }
  }, [item, onCopy]);

  const handleLongPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility('Copied to clipboard');
    handleCopy();
    if (showToast) {
      showToast();
    }
  }, [handleCopy, showToast]);

  const styles = getStyles(theme, item.mode === 'plan', item.agent);
  const baseMarkdownStyles = markdownStyles || getMarkdownStyles(theme);

  let itemStyle, messageStyle, containerStyle;

  messageLogger.debugCtx('RENDER', 'Rendering message', {
    id: item.messageId || item.id,
    role: item.role,
    type: item.type,
    source: item.source,
    hasText: !!item.message,
    payloadType: item.payloadType,
  });

  const msgRole = item.role;
  const msgType = item.type;

  // Check if this is a step-finish message with actual response content
  const isStepFinishWithContent =
    msgType === 'step-finish' && (item.message || item.displayMessage || item.content);

  if (msgRole === 'user') {
    itemStyle = styles.sentItem;
    messageStyle = styles.sentMessage;
    containerStyle = styles.rightAlignedContainer;
  } else if (isStepFinishWithContent) {
    // step-finish with actual response: show like assistant message (agent color, surface bg)
    itemStyle = styles.messageItem;
    messageStyle = styles.messageMessage;
    containerStyle = styles.leftAlignedContainer;
  } else if (msgType === 'error') {
    itemStyle = styles.errorItem;
    messageStyle = styles.errorMessage;
    containerStyle = styles.leftAlignedContainer;
  } else {
    // All other messages (reasoning, internal echos, partial_message, etc.): dark background for less attention
    itemStyle = styles.reasoningItem;
    messageStyle = { color: '#e0e0e0' };
    containerStyle = styles.leftAlignedContainer;
  }

  const isReasoning = msgType === 'reasoning';
  const contentColor = isReasoning ? '#e0e0e0' : theme.colors.textPrimary;

  const dynamicMarkdownStyles = {
    ...baseMarkdownStyles,
    body: { ...baseMarkdownStyles.body, color: contentColor },
    heading1: { ...baseMarkdownStyles.heading1, color: contentColor },
    heading2: { ...baseMarkdownStyles.heading2, color: contentColor },
    heading3: { ...baseMarkdownStyles.heading3, color: contentColor },
    paragraph: { ...baseMarkdownStyles.paragraph, color: contentColor },
    list_item: { ...baseMarkdownStyles.list_item, color: contentColor },
    fence: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      borderWidth: 1,
      fontFamily: 'monospace',
      padding: 10,
      borderRadius: 4,
      marginBottom: 8,
    },
    pre: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      borderWidth: 1,
      fontFamily: 'monospace',
      padding: 10,
      borderRadius: 4,
      marginBottom: 8,
    },
    code_block: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      borderWidth: 1,
      fontFamily: 'monospace',
      padding: 10,
      borderRadius: 4,
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      borderColor: theme.colors.border,
      borderWidth: 1,
      fontFamily: 'monospace',
      padding: 10,
      borderRadius: 4,
    },
    blockquote: {
      ...baseMarkdownStyles.blockquote,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
  };

  const debugId = item.messageId ? `${item.messageId.slice(-8)}` : item.id?.slice(-8) || 'no-id';
  const hasReasoning = !!item.reasoning || item.parts?.some(p => p.type === 'reasoning');
  const textLength = (item.message || '').length;
  const partsCount = item.parts?.length || 0;
  const typeDisplay = item.type || 'undefined';
  const debugText = `${debugId} | ${item.role || '?'} | ${typeDisplay} | ${item.mode || '?'} | ${hasReasoning ? '📝' : '📄'} | ${textLength} chars | ${partsCount} parts | src:${item.source || '?'}`;

  const getMessageContent = () => {
    try {
      let content = '';
      if (typeof item.message === 'string') {
        content = item.message;
      } else if (item.displayMessage && typeof item.displayMessage === 'string') {
        content = item.displayMessage;
      } else {
        content = JSON.stringify(item.message || item.payload || item, null, 2);
      }
      return content || 'No content available';
    } catch (error) {
      messageLogger.error('Failed to render message content', {
        messageId: item?.id,
        error: error.message,
      });
      return `Error rendering message: ${error.message}`;
    }
  };

  return (
    <View
      key={item.messageId || item.id}
      style={[styles.eventContainer, containerStyle]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.eventItem, itemStyle]}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        accessibilityLabel="Message. Long press to copy"
        accessibilityRole="button"
      >
        {showMeta && debugText && (
          <View style={styles.headerRow}>
            <Text style={styles.debugIdBadge}>{debugText}</Text>
          </View>
        )}
        <View style={[styles.markdownContainer, messageStyle]} pointerEvents="box-none">
          <Markdown style={dynamicMarkdownStyles} maxWidth="100%">
            {getMessageContent()}
          </Markdown>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default EventItem;
